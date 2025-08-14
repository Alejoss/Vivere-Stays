from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
import logging
from datetime import datetime, timedelta
from django.utils import timezone

from .models import Property, PropertyManagementSystem, DpMinimumSellingPrice, DpPriceChangeHistory
from .serializers import (
    PropertyCreateSerializer, 
    PropertyDetailSerializer, 
    PropertyListSerializer,
    PropertyManagementSystemSerializer,
    MinimumSellingPriceSerializer,
    PriceHistorySerializer
)

# Get logger for dynamic_pricing views
logger = logging.getLogger(__name__)


class PropertyManagementSystemListView(APIView):
    """
    API endpoint for listing all Property Management Systems
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Retrieve a list of all Property Management Systems
        """
        try:
            queryset = PropertyManagementSystem.objects.all().order_by('name')
            serializer = PropertyManagementSystemSerializer(queryset, many=True)
            
            return Response({
                'pms_list': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving PMS list: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving the PMS list',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PropertyCreateView(APIView):
    """
    API endpoint for creating a new Property
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Create a new property with the provided data and associate it with the current user's profile
        """
        try:
            # Check if this is part of the onboarding process
            is_onboarding = request.data.get('is_onboarding', False)
            
            # If it's onboarding, check if user already has a property
            if is_onboarding:
                user_profile = request.user.profile
                existing_properties = user_profile.get_properties()
                
                if existing_properties.exists():
                    # User already has a property, update the first one
                    property_instance = existing_properties.first()
                    serializer = PropertyCreateSerializer(property_instance, data=request.data, partial=True)
                    
                    if serializer.is_valid():
                        serializer.save()
                        
                        # Return the updated property with full details
                        detail_serializer = PropertyDetailSerializer(property_instance)
                        
                        logger.info(f"Property updated during onboarding: {property_instance.id} - {property_instance.name} for user: {request.user.username}")
                        
                        return Response({
                            'message': 'Property updated successfully during onboarding',
                            'property': detail_serializer.data,
                            'action': 'updated'
                        }, status=status.HTTP_200_OK)
                    else:
                        logger.warning(f"Property update during onboarding failed - validation errors: {serializer.errors}")
                        return Response({
                            'message': 'Property update failed during onboarding',
                            'errors': serializer.errors
                        }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create new property (either not onboarding or user has no existing properties)
            serializer = PropertyCreateSerializer(data=request.data)
            
            if serializer.is_valid():
                # Generate a unique ID for the property
                import uuid
                property_id = str(uuid.uuid4())
                
                # Create the property instance
                property_instance = serializer.save(id=property_id)
                
                # Associate the property with the current user's profile
                user_profile = request.user.profile
                user_profile.add_property(property_instance)
                
                # Return the created property with full details
                detail_serializer = PropertyDetailSerializer(property_instance)
                
                action = 'updated' if is_onboarding else 'created'
                logger.info(f"Property {action} successfully: {property_instance.id} - {property_instance.name} for user: {request.user.username}")
                
                return Response({
                    'message': f'Property {action} successfully',
                    'property': detail_serializer.data,
                    'action': action
                }, status=status.HTTP_201_CREATED)
            else:
                logger.warning(f"Property creation failed - validation errors: {serializer.errors}")
                return Response({
                    'message': 'Property creation failed',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error creating property: {str(e)}")
            return Response({
                'message': 'An error occurred while creating the property',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PropertyPMSUpdateView(APIView):
    """
    Dedicated API endpoint for updating PMS with additional logic
    """
    permission_classes = [IsAuthenticated]
    
    def put(self, request, property_id):
        """
        Update PMS for a specific property with additional validation and triggers
        """
        try:
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Get the new PMS ID from request
            new_pms_id = request.data.get('pms_id')
            if not new_pms_id:
                return Response({
                    'message': 'PMS ID is required',
                    'errors': {'pms_id': ['This field is required.']}
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate PMS exists
            try:
                new_pms = PropertyManagementSystem.objects.get(id=new_pms_id)
            except PropertyManagementSystem.DoesNotExist:
                return Response({
                    'message': 'Property Management System not found',
                    'errors': {'pms_id': ['Property Management System with this ID does not exist.']}
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Store the old PMS for comparison
            old_pms = property_instance.pms
            old_pms_name = property_instance.pms_name
            
            # Update the PMS
            property_instance.pms = new_pms
            property_instance.pms_name = new_pms.name  # Keep for backward compatibility
            
            # Trigger additional logic based on PMS change
            try:
                self._handle_pms_change(property_instance, old_pms, new_pms)
            except Exception as pms_error:
                logger.error(f"Error in PMS change handling for property {property_id}: {str(pms_error)}")
                return Response({
                    'message': 'PMS update failed due to integration error',
                    'error': str(pms_error)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Save the property
            property_instance.save()
            
            logger.info(f"PMS updated for property {property_id}: {old_pms_name} -> {new_pms.name}")
            
            # Return updated property details
            serializer = PropertyDetailSerializer(property_instance)
            
            return Response({
                'message': f'PMS updated successfully from {old_pms_name} to {new_pms.name}',
                'property': serializer.data,
                'pms_change': {
                    'old_pms': {
                        'id': old_pms.id,
                        'name': old_pms.name
                    },
                    'new_pms': {
                        'id': new_pms.id,
                        'name': new_pms.name
                    }
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error updating PMS for property {property_id}: {str(e)}")
            return Response({
                'message': 'An error occurred while updating the PMS',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _handle_pms_change(self, property_instance, old_pms, new_pms):
        """
        Handle additional logic when PMS changes
        """
        logger.info(f"Handling PMS change for property {property_instance.id}: {old_pms.name} -> {new_pms.name}")
        
        # Different logic based on the new PMS
        if new_pms.name.lower() == 'apaleo':
            self._handle_apaleo_integration(property_instance)
        elif new_pms.name.lower() == 'mrplan':
            self._handle_mrplan_integration(property_instance)
        elif new_pms.name.lower() == 'avirato':
            self._handle_avirato_integration(property_instance)
        elif new_pms.name.lower() == 'manual':
            self._handle_manual_mode(property_instance)
        
        # Additional common logic
        self._update_pms_specific_settings(property_instance, new_pms)
    
    def _handle_apaleo_integration(self, property_instance):
        """
        Handle Apaleo-specific integration logic
        """
        logger.info(f"Setting up Apaleo integration for property {property_instance.id}")
        # TODO: Implement Apaleo-specific logic
        # - Validate Apaleo credentials
        # - Set up webhooks
        # - Configure rate codes
        # - Update general settings for Apaleo
        
        # Example: Update general settings for Apaleo
        try:
            from .models import DpGeneralSettings
            settings, created = DpGeneralSettings.objects.get_or_create(
                property_id=property_instance
            )
            settings.is_base_in_pms = True  # Apaleo-specific setting
            settings.save()
            logger.info(f"Updated general settings for Apaleo property {property_instance.id}")
        except Exception as e:
            logger.error(f"Error updating general settings for Apaleo: {str(e)}")
            raise
    
    def _handle_mrplan_integration(self, property_instance):
        """
        Handle MrPlan-specific integration logic
        """
        logger.info(f"Setting up MrPlan integration for property {property_instance.id}")
        # TODO: Implement MrPlan-specific logic
        # - Validate MrPlan credentials
        # - Set up data synchronization
        # - Configure rate management
    
    def _handle_avirato_integration(self, property_instance):
        """
        Handle Avirato-specific integration logic
        """
        logger.info(f"Setting up Avirato integration for property {property_instance.id}")
        # TODO: Implement Avirato-specific logic
        # - Validate Avirato credentials
        # - Set up API connections
        # - Configure pricing rules
    
    def _handle_manual_mode(self, property_instance):
        """
        Handle manual mode setup
        """
        logger.info(f"Setting up manual mode for property {property_instance.id}")
        # TODO: Implement manual mode logic
        # - Disable automatic integrations
        # - Set up manual pricing controls
        # - Configure manual rate management
    
    def _update_pms_specific_settings(self, property_instance, pms):
        """
        Update PMS-specific settings and configurations
        """
        logger.info(f"Updating PMS-specific settings for {pms.name} property {property_instance.id}")
        # TODO: Implement PMS-specific settings updates
        # - Update rate codes
        # - Configure pricing rules
        # - Set up webhooks
        # - Update integration status


class PropertyDetailView(APIView):
    """
    API endpoint for retrieving, updating, and deleting a specific Property
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Retrieve a specific property by ID
        """
        try:
            property_instance = get_object_or_404(Property, id=property_id)
            serializer = PropertyDetailSerializer(property_instance)
            
            return Response({
                'property': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving property {property_id}: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving the property',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request, property_id):
        """
        Update a specific property by ID
        """
        try:
            property_instance = get_object_or_404(Property, id=property_id)
            serializer = PropertyDetailSerializer(property_instance, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                
                logger.info(f"Property updated successfully: {property_id}")
                
                return Response({
                    'message': 'Property updated successfully',
                    'property': serializer.data
                }, status=status.HTTP_200_OK)
            else:
                logger.warning(f"Property update failed - validation errors: {serializer.errors}")
                return Response({
                    'message': 'Property update failed',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error updating property {property_id}: {str(e)}")
            return Response({
                'message': 'An error occurred while updating the property',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, property_id):
        """
        Delete a specific property by ID (soft delete by setting is_active=False)
        """
        try:
            property_instance = get_object_or_404(Property, id=property_id)
            property_instance.is_active = False
            property_instance.save()
            
            logger.info(f"Property deactivated successfully: {property_id}")
            
            return Response({
                'message': 'Property deactivated successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error deactivating property {property_id}: {str(e)}")
            return Response({
                'message': 'An error occurred while deactivating the property',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PropertyListView(APIView):
    """
    API endpoint for listing all properties
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Retrieve a list of all active properties
        """
        try:
            # Get query parameters for filtering
            is_active = request.query_params.get('is_active', 'true').lower() == 'true'
            city = request.query_params.get('city')
            country = request.query_params.get('country')
            pms_id = request.query_params.get('pms_id')
            
            # Build queryset
            queryset = Property.objects.filter(is_active=is_active)
            
            if city:
                queryset = queryset.filter(city__icontains=city)
            
            if country:
                queryset = queryset.filter(country__icontains=country)
            
            if pms_id:
                queryset = queryset.filter(pms_id=pms_id)
            
            # Order by creation date (newest first)
            queryset = queryset.order_by('-created_at')
            
            serializer = PropertyListSerializer(queryset, many=True)
            
            return Response({
                'properties': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving properties list: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving the properties list',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MinimumSellingPriceView(APIView):
    """
    API endpoint for creating and managing Minimum Selling Price (MSP) entries
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get MSP entries for the user's property
        """
        try:
            user_profile = request.user.profile
            try:
                property_instance = user_profile.get_properties().latest('created_at')
            except Property.DoesNotExist:
                return Response({
                    'error': 'No property found for this user'
                }, status=status.HTTP_404_NOT_FOUND)
            
            msp_entries = DpMinimumSellingPrice.objects.filter(
                property_id=property_instance
            ).order_by('valid_from')
            
            serializer = MinimumSellingPriceSerializer(msp_entries, many=True)
            
            return Response({
                'msp_entries': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving MSP entries: {str(e)}")
            return Response({
                'error': 'Failed to retrieve MSP entries'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """
        Create or update MSP entries for a property
        """
        try:
            # Get the user's profile and their most recent property
            user_profile = request.user.profile
            try:
                property_instance = user_profile.get_properties().latest('created_at')
            except Property.DoesNotExist:
                return Response({
                    'error': 'No property found for this user'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get the periods data from request
            periods = request.data.get('periods', [])
            
            if not periods:
                return Response({
                    'error': 'No periods provided'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            created_msp_entries = []
            updated_msp_entries = []
            errors = []
            
            for period in periods:
                try:
                    # Parse dates from dd/mm/yyyy format
                    from_date = self._parse_date(period.get('fromDate'))
                    to_date = self._parse_date(period.get('toDate'))
                    price = int(period.get('price', 0))
                    period_title = period.get('periodTitle', '')  # Get optional period title
                    
                    if not from_date or not to_date:
                        errors.append(f"Invalid date format for period: {period}")
                        continue
                    
                    # Check if this is an existing entry (has existing- prefix in id)
                    period_id = period.get('id', '')
                    is_existing = period_id.startswith('existing-')
                    
                    if is_existing:
                        # Extract the actual database ID
                        db_id = period_id.replace('existing-', '')
                        
                        # Try to find and update the existing entry
                        try:
                            existing_entry = DpMinimumSellingPrice.objects.get(
                                id=db_id,
                                property_id=property_instance
                            )
                            
                            # Update the existing entry
                            existing_entry.valid_from = from_date
                            existing_entry.valid_until = to_date
                            existing_entry.msp = price
                            existing_entry.period_title = period_title
                            existing_entry.save()
                            
                            updated_msp_entries.append({
                                'id': existing_entry.id,
                                'valid_from': existing_entry.valid_from,
                                'valid_until': existing_entry.valid_until,
                                'msp': existing_entry.msp,
                                'period_title': existing_entry.period_title
                            })
                            
                        except DpMinimumSellingPrice.DoesNotExist:
                            errors.append(f"Could not find existing MSP entry with ID: {db_id}")
                            continue
                    else:
                        # Check for overlapping periods (only for new entries)
                        existing_same_start = DpMinimumSellingPrice.objects.filter(
                            property_id=property_instance,
                            valid_from=from_date
                        ).exists()
                        
                        if existing_same_start:
                            errors.append(f"An MSP entry already exists for the start date: {period.get('fromDate')}")
                            continue
                        
                        # Check for actual overlaps (periods that intersect)
                        existing_overlap = DpMinimumSellingPrice.objects.filter(
                            property_id=property_instance
                        ).filter(
                            # Periods overlap if: existing_start < new_end AND existing_end > new_start
                            valid_from__lt=to_date,
                            valid_until__gt=from_date
                        ).exists()
                        
                        # Debug: Let's see what existing entries we have
                        existing_entries = DpMinimumSellingPrice.objects.filter(
                            property_id=property_instance
                        ).values('valid_from', 'valid_until')
                        print(f"Debug - New period: {from_date} to {to_date}")
                        print(f"Debug - Existing entries: {list(existing_entries)}")
                        print(f"Debug - Overlap detected: {existing_overlap}")
                        
                        # More detailed debug: Check each existing entry individually
                        for entry in existing_entries:
                            existing_start = entry['valid_from']
                            existing_end = entry['valid_until']
                            overlaps = (existing_start < to_date) and (existing_end > from_date)
                            print(f"Debug - Checking overlap: existing({existing_start} to {existing_end}) vs new({from_date} to {to_date}) = {overlaps}")
                        
                        if existing_overlap:
                            errors.append(f"Period overlaps with existing MSP entry: {period.get('fromDate')} to {period.get('toDate')}")
                            continue
                        
                        # Create new MSP entry
                        msp_data = {
                            'property_id': property_instance.id,
                            'valid_from': from_date,
                            'valid_until': to_date,
                            'msp': price,
                            'period_title': period_title,
                            'manual_alternative_price': None  # Can be set later if needed
                        }
                        
                        serializer = MinimumSellingPriceSerializer(data=msp_data)
                        if serializer.is_valid():
                            msp_entry = serializer.save()
                            created_msp_entries.append(serializer.data)
                        else:
                            errors.append(f"Validation error for period {period}: {serializer.errors}")
                        
                except ValueError as e:
                    errors.append(f"Invalid price value for period {period}: {str(e)}")
                except Exception as e:
                    errors.append(f"Error processing period {period}: {str(e)}")
            
            if created_msp_entries or updated_msp_entries:
                return Response({
                    'message': f'Successfully processed MSP entries (Created: {len(created_msp_entries)}, Updated: {len(updated_msp_entries)})',
                    'created_entries': created_msp_entries,
                    'updated_entries': updated_msp_entries,
                    'errors': errors if errors else None
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'error': 'Failed to process any MSP entries',
                    'errors': errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error creating MSP entries: {str(e)}")
            return Response({
                'error': 'Failed to create MSP entries'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _parse_date(self, date_str):
        """
        Parse date from dd/mm/yyyy format to Date object
        """
        if not date_str:
            return None
        
        try:
            # Handle dd/mm/yyyy format
            if '/' in date_str:
                day, month, year = date_str.split('/')
                return datetime(int(year), int(month), int(day)).date()
            else:
                # Try ISO format
                return datetime.fromisoformat(date_str).date()
        except (ValueError, TypeError):
            return None

    def test_model_creation(self, request):
        """
        Test method to verify model creation works
        """
        try:
            logger.info("Testing MSP model creation...")
            
            # Get user's property
            user_profile = request.user.profile
            property_instance = user_profile.get_properties().latest('created_at')
            
            # Try to create a test MSP entry
            from datetime import date
            test_data = {
                'property_id': property_instance.id,
                'valid_from': date(2025, 1, 1),
                'valid_until': date(2025, 1, 31),
                'msp': 100,
                'manual_alternative_price': None
            }
            
            logger.info(f"Test data: {test_data}")
            
            serializer = MinimumSellingPriceSerializer(data=test_data)
            if serializer.is_valid():
                msp_entry = serializer.save()
                logger.info(f"Test MSP entry created successfully: {msp_entry.id}")
                
                # Clean up the test entry
                msp_entry.delete()
                logger.info("Test MSP entry deleted")
                
                return Response({
                    'message': 'MSP model creation test passed',
                    'test_entry_id': msp_entry.id
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"Test MSP creation failed: {serializer.errors}")
                return Response({
                    'error': 'Test MSP creation failed',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Test failed: {str(e)}", exc_info=True)
            return Response({
                'error': f'Test failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PriceHistoryView(APIView):
    """
    API endpoint for retrieving price history data for a property
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Retrieve price history data for a specific property
        Returns the most recent price data for each checkin_date
        """
        try:
            # Get the user's profile
            user_profile = request.user.profile
            
            # Verify the user owns this property
            if not user_profile.properties.filter(id=property_id).exists():
                logger.warning(f"User {request.user.username} attempted to access property {property_id} without ownership")
                return Response({
                    'message': 'Property not found or access denied'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get the property
            property_obj = get_object_or_404(Property, id=property_id)
            
            # Get query parameters for date range
            year = request.query_params.get('year', timezone.now().year)
            month = request.query_params.get('month', timezone.now().month)
            
            try:
                year = int(year)
                month = int(month)
            except ValueError:
                return Response({
                    'message': 'Invalid year or month parameter'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate date range for the month
            start_date = datetime(year, month, 1).date()
            if month == 12:
                end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
            else:
                end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)
            
            # Get the most recent price data for each checkin_date in the range
            # Using a subquery to get the latest as_of for each checkin_date
            from django.db.models import Max, Subquery, OuterRef
            
            latest_records = DpPriceChangeHistory.objects.filter(
                property_id=property_id,
                checkin_date__gte=start_date,
                checkin_date__lte=end_date
            ).values('checkin_date').annotate(
                latest_as_of=Max('as_of')
            ).values('checkin_date', 'latest_as_of')
            
            # Get the actual records with the latest as_of for each date
            price_history = []
            for record in latest_records:
                latest_price_record = DpPriceChangeHistory.objects.filter(
                    property_id=property_id,
                    checkin_date=record['checkin_date'],
                    as_of=record['latest_as_of']
                ).first()
                
                if latest_price_record:
                    serializer = PriceHistorySerializer(latest_price_record)
                    price_history.append(serializer.data)
            
            # Sort by checkin_date
            price_history.sort(key=lambda x: x['checkin_date'])
            
            logger.info(f"Retrieved price history for property {property_id} - {len(price_history)} records")
            
            return Response({
                'property_id': property_id,
                'property_name': property_obj.name,
                'year': year,
                'month': month,
                'price_history': price_history,
                'count': len(price_history)
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            logger.warning(f"Property {property_id} not found")
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"Error retrieving price history for property {property_id}: {str(e)}", exc_info=True)
            return Response({
                'message': 'An error occurred while retrieving price history',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
