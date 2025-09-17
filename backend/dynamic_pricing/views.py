from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser
from django.shortcuts import get_object_or_404
import logging
from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import DpMinimumSellingPrice, Property
from .serializers import MinimumSellingPriceSerializer
import requests
from decouple import config
from django.conf import settings

from .models import Property, PropertyManagementSystem, DpMinimumSellingPrice, DpPriceChangeHistory, DpGeneralSettings, DpOfferIncrements, DpDynamicIncrementsV2, DpLosReduction, DpLosSetup, DpRoomRates, UnifiedRoomsAndRates
from .serializers import (
    PropertyCreateSerializer, 
    PropertyDetailSerializer, 
    PropertyListSerializer,
    PropertyManagementSystemSerializer,
    MinimumSellingPriceSerializer,
    PriceHistorySerializer,
    CompetitorCandidateSerializer,
    BulkCompetitorCandidateSerializer,
    PropertyCompetitorSerializer,
    OfferIncrementsSerializer,
    BulkOfferIncrementsSerializer,
    DynamicIncrementsV2Serializer,
    BulkDynamicIncrementsV2Serializer,
    DpLosReductionSerializer,
    BulkDpLosReductionSerializer,
    DpLosSetupSerializer,
    BulkDpLosSetupSerializer,
    UnifiedRoomsAndRatesSerializer,
    AvailableRatesUnifiedSerializer,
    BulkAvailableRatesUpdateSerializer
)

from rest_framework.decorators import action
from .models import DpHistoricalCompetitorPrice
from .serializers import HistoricalCompetitorPriceSerializer
from django.db import models
import requests

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
                property_id=property_instance,
                user=request.user
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


class PropertyMSPView(APIView):
    """
    API endpoint for managing Minimum Selling Price (MSP) entries for a specific property
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Get MSP entries for a specific property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            msp_entries = DpMinimumSellingPrice.objects.filter(
                property_id=property_instance
            ).order_by('valid_from')
            
            serializer = MinimumSellingPriceSerializer(msp_entries, many=True)
            
            return Response({
                'msp_entries': serializer.data,
                'count': len(serializer.data),
                'property_id': property_id,
                'property_name': property_instance.name
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving MSP entries for property {property_id}: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving MSP entries',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request, property_id):
        """
        Create or update MSP entries for a property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
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
                        
                        serializer = MinimumSellingPriceSerializer(data=msp_data, context={'request': request})
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
            
            serializer = MinimumSellingPriceSerializer(data=test_data, context={'request': request})
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
            user_profile = request.user.profile
            if not user_profile.properties.filter(id=property_id).exists():
                logger.warning(f"User {request.user.username} attempted to access property {property_id} without ownership")
                return Response({
                    'message': 'Property not found or access denied'
                }, status=status.HTTP_404_NOT_FOUND)

            property_obj = get_object_or_404(Property, id=property_id)

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

            # For each day in the month, get the latest record by as_of
            price_history = []
            for day in range(1, (end_date - start_date).days + 2):
                checkin_date = start_date + timedelta(days=day - 1)
                latest_record = DpPriceChangeHistory.objects.filter(
                    property_id=property_id,
                    checkin_date=checkin_date
                ).order_by('-as_of').first()
                if latest_record:
                    serializer = PriceHistorySerializer(latest_record)
                    price_history.append(serializer.data)

            price_history.sort(key=lambda x: x['checkin_date'])

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


class OverwritePriceView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, property_id, checkin_date):
        """
        Create a new price history record for a given property and checkin_date, copying all fields from the latest record but setting overwrite_price to the provided value.
        """
        try:
            print(f"[OverwritePriceView] User: {request.user}")
            print(f"[OverwritePriceView] PATCH property_id={property_id}, checkin_date={checkin_date}")
            # Validate property
            property_obj = get_object_or_404(Property, id=property_id)
            # Find the latest price history record for this date
            price_record = (
                DpPriceChangeHistory.objects
                .filter(property_id=property_id, checkin_date=checkin_date)
                .order_by('-as_of')
                .first()
            )
            if not price_record:
                print(f"[OverwritePriceView] No price history found for property {property_id} on {checkin_date}")
                return Response({'error': 'Price history not found.'}, status=status.HTTP_404_NOT_FOUND)

            new_price = request.data.get('overwrite_price')
            print(f"[OverwritePriceView] New overwrite_price: {new_price}")
            if new_price is None:
                print(f"[OverwritePriceView] overwrite_price missing in request data: {request.data}")
                return Response({'error': 'overwrite_price is required.'}, status=status.HTTP_400_BAD_REQUEST)

            # Create a new record with the same fields, but updated overwrite_price and as_of
            new_record = DpPriceChangeHistory.objects.create(
                property_id=price_record.property_id,
                user=request.user,
                pms_hotel_id=price_record.pms_hotel_id,
                checkin_date=price_record.checkin_date,
                as_of=timezone.now(),
                occupancy=price_record.occupancy,
                msp=price_record.msp,
                recom_price=price_record.recom_price,
                overwrite_price=new_price,
                recom_los=price_record.recom_los,
                overwrite_los=price_record.overwrite_los,
                base_price=price_record.base_price,
                base_price_choice=price_record.base_price_choice,
            )
            print(f"[OverwritePriceView] Created new price history record with id: {new_record.id}")

            serializer = PriceHistorySerializer(new_record)
            return Response({'message': 'Overwrite price set. New price history record created.', 'price_history': serializer.data}, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"[OverwritePriceView] Exception: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def price_history_for_date_range(request, property_id):
    """
    Get price history data for a property for a specific date range.
    Query params:
        - start_date (YYYY-MM-DD): The start date (required)
        - end_date (YYYY-MM-DD): The end date (required)
    Response:
        {
            "property_id": "uuid",
            "start_date": "2025-01-01",
            "end_date": "2025-01-05",
            "price_history": [
                {"checkin_date": "2025-01-01", "price": 100, "occupancy_level": "medium", "overwrite": false},
                ...
            ],
            "average_price": 95.5,
            "count": 5
        }
    """
    from datetime import datetime, timedelta
    from .models import DpPriceChangeHistory
    from .serializers import PriceHistorySerializer

    # Parse date parameters
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')
    
    if not start_date_str or not end_date_str:
        return Response({
            'error': 'start_date and end_date query parameters are required (YYYY-MM-DD)'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({
            'error': 'Invalid date format, expected YYYY-MM-DD'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if end_date < start_date:
        return Response({
            'error': 'end_date must be after or equal to start_date'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if date range is more than one month (31 days)
    date_difference = (end_date - start_date).days
    if date_difference > 31:
        return Response({
            'error': 'Date range cannot exceed 31 days (one month). Please select a shorter date range.'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Validate property ownership
        user_profile = request.user.profile
        if not user_profile.properties.filter(id=property_id).exists():
            logger.warning(f"User {request.user.username} attempted to access property {property_id} without ownership")
            return Response({
                'message': 'Property not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)

        property_obj = get_object_or_404(Property, id=property_id)

        # Get price history for each day in the range
        price_history = []
        total_price = 0
        valid_days = 0
        
        current_date = start_date
        while current_date <= end_date:
            latest_record = DpPriceChangeHistory.objects.filter(
                property_id=property_id,
                checkin_date=current_date
            ).order_by('-as_of').first()
            
            if latest_record:
                serializer = PriceHistorySerializer(latest_record)
                price_data = serializer.data
                price_history.append(price_data)
                
                # Add to total for average calculation
                if price_data['price'] is not None:
                    total_price += price_data['price']
                    valid_days += 1
            
            current_date += timedelta(days=1)

        # Calculate average price
        average_price = round(total_price / valid_days, 2) if valid_days > 0 else 0

        return Response({
            'property_id': property_id,
            'property_name': property_obj.name,
            'start_date': start_date_str,
            'end_date': end_date_str,
            'price_history': price_history,
            'average_price': average_price,
            'count': len(price_history),
            'valid_days': valid_days
        }, status=status.HTTP_200_OK)
        
    except Property.DoesNotExist:
        logger.warning(f"Property {property_id} not found")
        return Response({
            'message': 'Property not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error retrieving price history for date range for property {property_id}: {str(e)}", exc_info=True)
        return Response({
            'message': 'An error occurred while retrieving price history',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OverwritePriceRangeView(APIView):
    """
    API endpoint to overwrite prices for a range of dates for a property.
    POST /dynamic-pricing/properties/{property_id}/price-history/overwrite-range/
    Body: {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "overwrite_price": 123}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, property_id):
        try:
            start_date_str = request.data.get('start_date')
            end_date_str = request.data.get('end_date')
            overwrite_price = request.data.get('overwrite_price')
            if not (start_date_str and end_date_str and overwrite_price is not None):
                return Response({'error': 'start_date, end_date, and overwrite_price are required.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
            if end_date < start_date:
                return Response({'error': 'end_date must be after or equal to start_date.'}, status=status.HTTP_400_BAD_REQUEST)
            property_obj = get_object_or_404(Property, id=property_id)
            created_records = []
            errors = []
            for i in range((end_date - start_date).days + 1):
                checkin_date = start_date + timedelta(days=i)
                price_record = (
                    DpPriceChangeHistory.objects
                    .filter(property_id=property_id, checkin_date=checkin_date)
                    .order_by('-as_of')
                    .first()
                )
                if not price_record:
                    errors.append(str(checkin_date))
                    continue
                new_record = DpPriceChangeHistory.objects.create(
                    property_id=price_record.property_id,
                    user=request.user,
                    pms_hotel_id=price_record.pms_hotel_id,
                    checkin_date=price_record.checkin_date,
                    as_of=timezone.now(),
                    occupancy=price_record.occupancy,
                    msp=price_record.msp,
                    recom_price=price_record.recom_price,
                    overwrite_price=overwrite_price,
                    recom_los=price_record.recom_los,
                    overwrite_los=price_record.overwrite_los,
                    base_price=price_record.base_price,
                    base_price_choice=price_record.base_price_choice,
                )
                created_records.append(PriceHistorySerializer(new_record).data)
            return Response({
                'message': f'Processed {len(created_records)} dates. {len(errors)} errors.',
                'created': created_records,
                'errors': errors,
                'start_date': start_date_str,
                'end_date': end_date_str,
                'overwrite_price': overwrite_price,
            }, status=status.HTTP_201_CREATED if created_records else status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def property_msp_for_date(request, property_id):
    """
    Get the Minimum Selling Price (MSP) for a property for a specific date.
    Query param: date=YYYY-MM-DD
    """
    from datetime import datetime
    date_str = request.query_params.get('date')
    if not date_str:
        return Response({'error': 'Missing date parameter'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format, expected YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

    property_instance = get_object_or_404(Property, id=property_id)
    msp_entry = DpMinimumSellingPrice.objects.filter(
        property_id=property_instance,
        valid_from__lte=date_obj,
        valid_until__gte=date_obj
    ).first()
    if not msp_entry:
        return Response({'error': 'No MSP configured for this date'}, status=status.HTTP_404_NOT_FOUND)
    serializer = MinimumSellingPriceSerializer(msp_entry)
    return Response(serializer.data, status=status.HTTP_200_OK)


def get_lowest_competitor_prices_queryset(base_queryset=None):
    """
    Utility to get, for each (competitor, checkin_date), the row with the lowest raw_price.
    Filters out rows where max_persons < 0 or hotel_name == 'NOT PARSABLE'.
    Uses a window function to partition by competitor and checkin_date, ordering by raw_price.
    Args:
        base_queryset: Optionally, a queryset to start from. If None, uses all DpHistoricalCompetitorPrice objects.
    Returns:
        Queryset annotated with lowest price per (competitor, checkin_date).
    """
    from django.db.models import F, Window
    from django.db.models.functions import RowNumber
    from .models import DpHistoricalCompetitorPrice
    from django.db import models

    qs = base_queryset or DpHistoricalCompetitorPrice.objects.all()
    qs = qs.filter(
        models.Q(max_persons__lt=0) | models.Q(max_persons__gte=2),
        ~models.Q(hotel_name='NOT PARSABLE')
    )
    qs = qs.annotate(
        rn=Window(
            expression=RowNumber(),
            partition_by=[F('competitor'), F('checkin_date')],
            order_by=F('raw_price').asc(nulls_last=True)
        )
    ).filter(rn=1)
    return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lowest_competitor_prices(request):
    """
    Retrieve, for each (competitor_id, checkin_date), the historical competitor price row with the lowest raw_price.
    Filters out rows where max_persons < 0 or hotel_name == 'NOT PARSABLE'.
    Equivalent to the following SQL:

        SELECT * FROM (
          SELECT *, ROW_NUMBER() OVER(
            PARTITION BY cp.competitor_id, cp.checkin_date
            ORDER BY cp.raw_price ASC
          ) as rn
          FROM booking.historical_competitor_prices cp
          WHERE (
              cp.max_persons < 0
              OR cp.max_persons >= 2
            )
            AND cp.hotel_name != 'NOT PARSABLE'
        ) ranked_prices
        WHERE rn = 1;

    Returns:
        List of lowest price records per (competitor_id, checkin_date).
    """
    qs = get_lowest_competitor_prices_queryset()
    serializer = HistoricalCompetitorPriceSerializer(qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def competitor_prices_weekly_chart(request, property_id):
    """
    Returns a matrix of lowest competitor prices for a property for a given week.
    - Rows: Each competitor (by name)
    - Columns: Each day of the week (dates)
    - Cells: The lowest price for that competitor on that date
    Query params:
        - start_date (YYYY-MM-DD): The Monday of the week (required)
    Response:
        {
            "dates": ["2024-06-10", ...],
            "competitors": [
                {"id": 1, "name": "Hotel X", "prices": [56, 57, ...]},
                ...
            ]
        }
    """
    from datetime import datetime, timedelta
    from .models import DpPropertyCompetitor, DpHistoricalCompetitorPrice
    from booking.models import Competitor

    # Parse start_date
    start_date_str = request.query_params.get('start_date')
    if not start_date_str:
        return Response({'error': 'start_date query parameter is required (YYYY-MM-DD)'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid start_date format, expected YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
    # Build week dates (Monday to Sunday)
    week_dates = [start_date + timedelta(days=i) for i in range(7)]
    # Get competitors for the property
    competitor_links = DpPropertyCompetitor.objects.filter(property_id=property_id)
    competitor_ids = list(competitor_links.values_list('competitor_id', flat=True))
    competitors = Competitor.objects.filter(id__in=competitor_ids)
    # Get lowest prices for these competitors and dates
    price_qs = DpHistoricalCompetitorPrice.objects.filter(
        competitor_id__in=competitor_ids,
        checkin_date__in=week_dates
    )
    lowest_prices = get_lowest_competitor_prices_queryset(price_qs)
    # Build a lookup: {(competitor_id, checkin_date): price}
    price_lookup = {}
    for row in lowest_prices:
        price_lookup[(row.competitor_id, row.checkin_date)] = row.raw_price
    # Build response
    competitors_data = []
    for comp in competitors:
        prices = [price_lookup.get((comp.id, d), None) for d in week_dates]
        competitors_data.append({
            'id': comp.id,
            'name': comp.competitor_name,
            'prices': prices
        })
    return Response({
        'dates': [d.isoformat() for d in week_dates],
        'competitors': competitors_data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def competitor_prices_for_date(request, property_id):
    """
    Returns a list of lowest competitor prices for a property for a given date.
    Query params:
        - date (YYYY-MM-DD): The date to fetch prices for (required)
    Response:
        [
            {"id": 1, "name": "Hotel X", "price": 56, "currency": "USD", "room_name": "Standard Room"},
            ...
        ]
    """
    from datetime import datetime
    from .models import DpPropertyCompetitor, DpHistoricalCompetitorPrice
    from booking.models import Competitor

    print(f"[DEBUG] competitor_prices_for_date called with property_id={property_id}")
    print(f"[DEBUG] request.path: {request.path}")
    print(f"[DEBUG] request.query_params: {request.query_params}")
    
    # Parse date
    date_str = request.query_params.get('date')
    print(f"[DEBUG] date_str from query params: {date_str}")
    if not date_str:
        print("[DEBUG] Missing date parameter")
        return Response({'error': 'date query parameter is required (YYYY-MM-DD)'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        print(f"[DEBUG] parsed date_obj: {date_obj}")
    except ValueError:
        print(f"[DEBUG] Invalid date format: {date_str}")
        return Response({'error': 'Invalid date format, expected YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
    # Get competitors for the property
    competitor_links = DpPropertyCompetitor.objects.filter(property_id=property_id)
    print(f"[DEBUG] competitor_links found: {competitor_links.count()}")
    competitor_ids = list(competitor_links.values_list('competitor_id', flat=True))
    print(f"[DEBUG] competitor_ids: {competitor_ids}")
    competitors = Competitor.objects.filter(id__in=competitor_ids)
    print(f"[DEBUG] competitors found: {competitors.count()}")
    # Get lowest prices for these competitors for the date
    price_qs = DpHistoricalCompetitorPrice.objects.filter(
        competitor_id__in=competitor_ids,
        checkin_date=date_obj
    )
    lowest_prices = get_lowest_competitor_prices_queryset(price_qs)
    # Build a lookup: {competitor_id: row}
    price_lookup = {row.competitor_id: row for row in lowest_prices}
    # Build response
    competitors_data = []
    for comp in competitors:
        row = price_lookup.get(comp.id)
        competitors_data.append({
            'id': comp.id,
            'name': comp.competitor_name,
            'price': row.raw_price if row else None,
            'currency': row.currency if row else None,
            'room_name': row.room_name if row else None,
        })
    return Response(competitors_data, status=status.HTTP_200_OK)


class FetchCompetitorsView(APIView):
    """
    API endpoint to fetch competitors from an external API using a Booking.com URL.
    """
    # permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Fetch competitors from the external API using a Booking.com URL.
        Expected request body: {"booking_url": "https://booking.com/hotel/..."}
        """
        print(f"[FetchCompetitorsView] Starting request processing")
        print(f"[FetchCompetitorsView] Request data: {request.data}")
        
        try:
            # Get the booking URL from the request
            booking_url = request.data.get('booking_url')
            print(f"[FetchCompetitorsView] Booking URL: {booking_url}")
            
            if not booking_url:
                print(f"[FetchCompetitorsView] ERROR: No booking_url provided")
                return Response({
                    'error': 'booking_url is required in request body'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get API configuration from settings and environment
            api_base_url = settings.COMPETITOR_API_BASE_URL
            api_token = config('HOTEL_COMPETITOR_SERVICE_TOKEN', default='')
            
            print(f"[FetchCompetitorsView] API Base URL: {api_base_url}")
            print(f"[FetchCompetitorsView] API Token: {api_token[:10]}..." if api_token else "None")
            
            if not api_token:
                print(f"[FetchCompetitorsView] ERROR: No API token configured")
                logger.error("Competitor API configuration missing: COMPETITOR_API_TOKEN")
                return Response({
                    'error': 'Competitor API not properly configured'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            # Prepare the request to the external API
            api_url = f"{api_base_url}/api/v1/competitors"
            headers = {
                'Authorization': f'Bearer {api_token}',
                'Content-Type': 'application/json'
            }
            payload = {
                'booking_url': booking_url,
                'num_competitors': 5
            }

            print(f"[FetchCompetitorsView] Full API URL: {api_url}")
            print(f"[FetchCompetitorsView] Headers: {headers}")
            print(f"[FetchCompetitorsView] Payload: {payload}")

            logger.info(f"Calling external competitor API: {api_url}")
            logger.info(f"Request payload: {payload}")

            # Make the request to the external API
            print(f"[FetchCompetitorsView] Making HTTP request...")
            response = requests.post(api_url, headers=headers, json=payload, timeout=30)
            print(f"[FetchCompetitorsView] Response status code: {response.status_code}")
            print(f"[FetchCompetitorsView] Response headers: {dict(response.headers)}")
            
            # Print response content for debugging
            try:
                response_text = response.text
                print(f"[FetchCompetitorsView] Response text: {response_text}")
                if response_text:
                    print(f"[FetchCompetitorsView] Response text length: {len(response_text)}")
            except Exception as e:
                print(f"[FetchCompetitorsView] Error reading response text: {e}")
            
            if response.status_code == 401:
                print(f"[FetchCompetitorsView] ERROR: 401 Unauthorized - Authentication failed")
                logger.error("Authentication failed with external competitor API")
                return Response({
                    'error': 'Authentication failed with competitor API'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if response.status_code == 404:
                print(f"[FetchCompetitorsView] ERROR: 404 Not Found - No competitors found")
                logger.warning(f"No competitors found for URL: {booking_url}")
                return Response({
                    'error': 'No competitors found for the provided Booking.com URL'
                }, status=status.HTTP_404_NOT_FOUND)
            
            print(f"[FetchCompetitorsView] Response status is not 401 or 404, checking for other errors...")
            
            try:
                response.raise_for_status()
                print(f"[FetchCompetitorsView] Response status is OK, proceeding to parse JSON")
            except requests.exceptions.HTTPError as e:
                print(f"[FetchCompetitorsView] HTTP Error: {e}")
                print(f"[FetchCompetitorsView] Response content: {response.text}")
                raise
            
            # Parse the response
            try:
                api_response = response.json()
                print(f"[FetchCompetitorsView] Successfully parsed JSON response")
                print(f"[FetchCompetitorsView] API Response keys: {list(api_response.keys()) if isinstance(api_response, dict) else 'Not a dict'}")
                
                logger.info(f"External API response: {api_response}")
            except Exception as e:
                print(f"[FetchCompetitorsView] ERROR parsing JSON response: {e}")
                print(f"[FetchCompetitorsView] Raw response text: {response.text}")
                raise
            
            # Extract the competitors from the response
            competitors = api_response.get('competitors', [])
            target_hotel = api_response.get('target_hotel', {})
            
            print(f"[FetchCompetitorsView] Found {len(competitors)} competitors in response")
            print(f"[FetchCompetitorsView] Target hotel: {target_hotel.get('name', 'Unknown')}")
            
            # Process and return the competitors
            processed_competitors = []
            for i, comp in enumerate(competitors):
                print(f"[FetchCompetitorsView] Processing competitor {i+1}: {comp}")
                hotel_data = comp.get('hotel', {})
                processed_competitor = {
                    'name': hotel_data.get('name', 'Unknown Hotel'),
                    'booking_url': hotel_data.get('booking_url'),
                    'review_score': hotel_data.get('review_score'),
                    'similarity_score': comp.get('similarity_score'),
                    'distance_km': comp.get('distance_km'),
                    'location': hotel_data.get('location', {}),
                    'amenities': hotel_data.get('amenities', [])
                }
                processed_competitors.append(processed_competitor)
                print(f"[FetchCompetitorsView] Processed competitor: {processed_competitor['name']}")

            final_response = {
                'message': f'Successfully found {len(processed_competitors)} competitors',
                'target_hotel': {
                    'name': target_hotel.get('name', 'Unknown Hotel'),
                    'booking_url': target_hotel.get('booking_url'),
                    'review_score': target_hotel.get('review_score'),
                    'location': target_hotel.get('location', {})
                },
                'competitors': processed_competitors,
                'processing_time_ms': api_response.get('processing_time_ms'),
                'total_competitors_found': api_response.get('total_competitors_found')
            }
            
            print(f"[FetchCompetitorsView] SUCCESS: Returning response with {len(processed_competitors)} competitors")
            print(f"[FetchCompetitorsView] Final response: {final_response}")
            
            return Response(final_response, status=status.HTTP_200_OK)
            
        except requests.exceptions.Timeout:
            print(f"[FetchCompetitorsView] ERROR: Request timeout")
            logger.error("Timeout while calling external competitor API")
            return Response({
                'error': 'Request to competitor API timed out'
            }, status=status.HTTP_504_GATEWAY_TIMEOUT)
            
        except requests.exceptions.RequestException as e:
            print(f"[FetchCompetitorsView] ERROR: Request exception: {e}")
            logger.error(f"Error calling external competitor API: {str(e)}")
            return Response({
                'error': f'Failed to call competitor API: {str(e)}'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        except Exception as e:
            print(f"[FetchCompetitorsView] ERROR: Unexpected exception: {e}")
            print(f"[FetchCompetitorsView] Exception type: {type(e)}")
            import traceback
            print(f"[FetchCompetitorsView] Traceback: {traceback.format_exc()}")
            logger.error(f"Unexpected error in FetchCompetitorsView: {str(e)}")
            return Response({
                'error': 'An unexpected error occurred while fetching competitors'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NearbyHotelsView(APIView):
    """
    API endpoint to fetch nearby hotels using external service
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        """
        Fetch nearby hotels from external API using property location data
        Expected request body: {
            "address": "Street address",
            "city": "City name", 
            "country": "Country name",
            "postal_code": "Postal code"
        }
        """
        try:
            # Ensure request.data is a dictionary
            if not isinstance(request.data, dict):
                return Response({
                    'error': 'Invalid request format. Expected JSON object.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get location data from request
            address = request.data.get('address', '').strip()
            city = request.data.get('city', '').strip()
            country = request.data.get('country', '').strip()
            postal_code = request.data.get('postal_code', '').strip()
            
            if not address or not city:
                return Response({
                    'error': 'Address and city are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Build the query string
            query_params = []
            if address:
                # URL encode the address (spaces become %20, special chars encoded)
                encoded_address = requests.utils.quote(address)
                query_params.append(f"address={encoded_address}")
            if city:
                encoded_city = requests.utils.quote(city)
                query_params.append(f"city={encoded_city}")
            if country:
                encoded_country = requests.utils.quote(country)
                query_params.append(f"country={encoded_country}")
            
            # Add limit at the end to match the working URL
            query_params.append("limit=5")
            
            query_string = "&".join(query_params)
            
            # Get API configuration from settings
            api_base_url = "https://hotel-competitor-service-e3keqismia-ew.a.run.app/api/v1/nearby-hotels"
            api_token = settings.HOTEL_COMPETITOR_SERVICE_TOKEN
            
            if not api_token:
                return Response({
                    'error': 'Hotel competitor service not properly configured'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            # Get number of competitors from request body (default to 5)
            num_competitors = request.data.get('num_competitors', 5)
            
            # Add limit to query string
            query_params.append(f"limit={num_competitors}")
            query_string = "&".join(query_params)
            
            # Prepare the request to the external API
            api_url = f"{api_base_url}?{query_string}"
            headers = {
                'Authorization': f'Bearer {api_token}',
            }

            # Make the request to the external API
            response = requests.get(api_url, headers=headers, timeout=30)
            
            if response.status_code == 401:
                return Response({
                    'error': 'Authentication failed with nearby hotels API'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if response.status_code == 404:
                return Response({
                    'error': 'No nearby hotels found for the provided location'
                }, status=status.HTTP_404_NOT_FOUND)
            
            try:
                response.raise_for_status()
            except requests.exceptions.HTTPError as e:
                raise
            
            # Parse the response
            try:
                api_response = response.json()
            except Exception as e:
                raise
            
            # The API always returns a list of hotel names
            hotel_names = []
            if isinstance(api_response, list):
                hotel_names = [name.strip() for name in api_response if name and name.strip()]

            return Response(hotel_names, status=status.HTTP_200_OK)
            
        except requests.exceptions.Timeout:
            return Response({
                'error': 'Request to nearby hotels API timed out'
            }, status=status.HTTP_504_GATEWAY_TIMEOUT)
            
        except requests.exceptions.RequestException as e:
            return Response({
                'error': f'Failed to call nearby hotels API: {str(e)}'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        except Exception as e:
            return Response({
                'error': 'An unexpected error occurred while fetching nearby hotels'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BulkCompetitorCandidateCreateView(APIView):
    """
    API endpoint for creating multiple competitor candidates at once
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, property_id=None):
        """
        Create multiple competitor candidates for a property
        """
        try:
            # Pass property_id to serializer context if provided
            context = {'request': request}
            if property_id:
                context['property_id'] = property_id
                
            serializer = BulkCompetitorCandidateSerializer(data=request.data, context=context)
            
            if serializer.is_valid():
                # Create the competitor candidates
                result = serializer.save()
                
                # Prepare response data
                created_candidates = result['created_candidates']
                errors = result['errors']
                property_id = result['property_id']
                
                # Serialize the created candidates
                candidate_serializer = CompetitorCandidateSerializer(created_candidates, many=True)
                
                response_data = {
                    'message': f'Successfully created {len(created_candidates)} competitor candidates',
                    'property_id': property_id,
                    'created_candidates': candidate_serializer.data,
                    'total_created': len(created_candidates),
                    'total_errors': len(errors)
                }
                
                if errors:
                    response_data['errors'] = errors
                    response_data['message'] += f' with {len(errors)} errors'
                
                logger.info(f"Bulk competitor candidate creation completed: {len(created_candidates)} created, {len(errors)} errors")
                
                return Response(response_data, status=status.HTTP_201_CREATED)
            else:
                logger.warning(f"Bulk competitor candidate creation failed - validation errors: {serializer.errors}")
                return Response({
                    'message': 'Bulk competitor candidate creation failed',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error in bulk competitor candidate creation: {str(e)}")
            return Response({
                'message': 'An error occurred while creating the competitor candidates',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DpGeneralSettingsUpdateView(APIView):
    """
    API endpoint for getting and updating DpGeneralSettings
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Get the general settings for a property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Retrieve settings by property only to avoid duplicate PK on OneToOne
            settings = DpGeneralSettings.objects.filter(property_id=property_instance).first()
            created = False
            if not settings:
                print(f"🔧 DEBUG: No settings found, creating default for property {property_id}")
                settings = DpGeneralSettings.objects.create(
                    property_id=property_instance,
                    user=request.user,
                    comp_price_calculation='min',
                    min_competitors=2,
                    future_days_to_price=365,
                    pricing_status='offline',
                    los_status='offline',
                    los_num_competitors=2,
                    los_aggregation='min'
                )
                created = True
            
            return Response({
                'property_id': property_id,
                'min_competitors': settings.min_competitors,
                'comp_price_calculation': settings.comp_price_calculation,
                'future_days_to_price': settings.future_days_to_price,
                'pricing_status': settings.pricing_status,
                'los_status': settings.los_status,
                'los_num_competitors': settings.los_num_competitors,
                'los_aggregation': settings.los_aggregation,
                'otas_price_diff': settings.otas_price_diff,
                'created_at': settings.created_at,
                'updated_at': settings.updated_at
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'message': 'An error occurred while retrieving general settings',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request, property_id):
        """
        Update the general settings for a property (comp_price_calculation and min_competitors)
        """
        print(f"🔧 DEBUG: PATCH request received for property_id: {property_id}")
        print(f"🔧 DEBUG: Request data: {request.data}")
        print(f"🔧 DEBUG: User: {request.user}")
        
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            print(f"🔧 DEBUG: Property found: {property_instance.name}")
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            print(f"🔧 DEBUG: User has access to {user_properties.count()} properties")
            
            if not user_properties.filter(id=property_id).exists():
                print(f"🔧 DEBUG: User does NOT have access to property {property_id}")
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            print(f"🔧 DEBUG: User has access to property {property_id}")
            
            # Retrieve settings by property only to avoid duplicate PK on OneToOne
            settings = DpGeneralSettings.objects.filter(property_id=property_instance).first()
            created = False
            if not settings:
                print(f"🔧 DEBUG: No settings found, creating default for property {property_id}")
                settings = DpGeneralSettings.objects.create(
                    property_id=property_instance,
                    user=request.user,
                    comp_price_calculation='min',
                    min_competitors=2,
                    future_days_to_price=365,
                    pricing_status='offline',
                    los_status='offline',
                    los_num_competitors=2,
                    los_aggregation='min'
                )
                created = True
            else:
                # If settings exist but belong to another user, keep owner but allow updates
                print(f"🔧 DEBUG: Retrieved existing settings (owner user_id={settings.user_id})")
            print(f"🔧 DEBUG: Settings {'created' if created else 'retrieved'}: comp_price_calculation={settings.comp_price_calculation}")
            
            # Track what fields are being updated
            updated_fields = []
            
            # Update comp_price_calculation if provided
            if 'comp_price_calculation' in request.data:
                new_calculation = request.data.get('comp_price_calculation')
                print(f"🔧 DEBUG: Updating comp_price_calculation to: {new_calculation}")
                allowed_values = ['min', 'max', 'avg', 'median']
                if new_calculation not in allowed_values:
                    print(f"🔧 DEBUG: Invalid comp_price_calculation value: {new_calculation}")
                    return Response({
                        'message': f'comp_price_calculation must be one of: {", ".join(allowed_values)}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                old_calculation = settings.comp_price_calculation
                print(f"🔧 DEBUG: Changing comp_price_calculation from '{old_calculation}' to '{new_calculation}'")
                settings.comp_price_calculation = new_calculation
                updated_fields.append(f'comp_price_calculation: {old_calculation} -> {new_calculation}')
            else:
                print(f"🔧 DEBUG: No comp_price_calculation in request data")
            
            # Update min_competitors if provided
            if 'min_competitors' in request.data:
                new_min_competitors = request.data.get('min_competitors')
                if not isinstance(new_min_competitors, int) or new_min_competitors < 1:
                    return Response({
                        'message': 'min_competitors must be a positive integer'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                old_min_competitors = settings.min_competitors
                settings.min_competitors = new_min_competitors
                updated_fields.append(f'min_competitors: {old_min_competitors} -> {new_min_competitors}')
            
            # Update los_num_competitors if provided
            if 'los_num_competitors' in request.data:
                new_los_num_competitors = request.data.get('los_num_competitors')
                if not isinstance(new_los_num_competitors, int) or new_los_num_competitors < 1:
                    return Response({
                        'message': 'los_num_competitors must be a positive integer'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                old_los_num_competitors = settings.los_num_competitors
                settings.los_num_competitors = new_los_num_competitors
                updated_fields.append(f'los_num_competitors: {old_los_num_competitors} -> {new_los_num_competitors}')
            
            # Update los_aggregation if provided
            if 'los_aggregation' in request.data:
                new_los_aggregation = request.data.get('los_aggregation')
                print(f"🔧 DEBUG: Updating los_aggregation to: {new_los_aggregation}")
                allowed_values = ['min', 'max']
                if new_los_aggregation not in allowed_values:
                    print(f"🔧 DEBUG: Invalid los_aggregation value: {new_los_aggregation}")
                    return Response({
                        'message': f'los_aggregation must be one of: {", ".join(allowed_values)}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                old_los_aggregation = settings.los_aggregation
                print(f"🔧 DEBUG: Changing los_aggregation from '{old_los_aggregation}' to '{new_los_aggregation}'")
                settings.los_aggregation = new_los_aggregation
                updated_fields.append(f'los_aggregation: {old_los_aggregation} -> {new_los_aggregation}')

            # Update otas_price_diff if provided
            if 'otas_price_diff' in request.data:
                try:
                    new_otas_price_diff = float(request.data.get('otas_price_diff'))
                except (TypeError, ValueError):
                    return Response({
                        'message': 'otas_price_diff must be a valid number'
                    }, status=status.HTTP_400_BAD_REQUEST)
                old_otas_price_diff = settings.otas_price_diff
                settings.otas_price_diff = new_otas_price_diff
                updated_fields.append(f'otas_price_diff: {old_otas_price_diff} -> {new_otas_price_diff}')
            
            # Save if any fields were updated
            if updated_fields:
                print(f"🔧 DEBUG: Saving settings with updated fields: {updated_fields}")
                settings.save()
                print(f"🔧 DEBUG: Settings saved successfully. New comp_price_calculation: {settings.comp_price_calculation}")
                return Response({
                    'message': 'General settings updated successfully',
                    'property_id': property_id,
                    'updated_fields': updated_fields,
                    'comp_price_calculation': settings.comp_price_calculation,
                    'min_competitors': settings.min_competitors,
                    'los_num_competitors': settings.los_num_competitors,
                    'los_aggregation': settings.los_aggregation,
                    'otas_price_diff': settings.otas_price_diff,
                    'updated_at': settings.updated_at
                }, status=status.HTTP_200_OK)
            else:
                print(f"🔧 DEBUG: No fields to update")
                return Response({
                    'message': 'No fields to update',
                    'property_id': property_id
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Property.DoesNotExist:
            print(f"🔧 DEBUG: Property not found: {property_id}")
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"🔧 DEBUG: Exception occurred: {str(e)}")
            import traceback
            print(f"🔧 DEBUG: Traceback: {traceback.format_exc()}")
            return Response({
                'message': 'An error occurred while updating general settings',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompetitorCandidatesListView(APIView):
    """
    API endpoint for listing competitor candidates for a property
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Retrieve competitor candidates for a specific property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get competitor candidates for this property
            from .models import CompetitorCandidate
            candidates = CompetitorCandidate.objects.filter(
                property_id=property_instance,
                deleted=False
            ).order_by('created_at')
            
            serializer = CompetitorCandidateSerializer(candidates, many=True)
            
            print(f"Retrieved {len(candidates)} competitor candidates for property {property_id}")
            
            return Response({
                'candidates': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Error retrieving competitor candidates: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving competitor candidates',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PropertyCompetitorsListView(APIView):
    """
    API endpoint for listing processed competitors for a property
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Retrieve processed competitors for a specific property
        """
        try:
            property_instance = get_object_or_404(Property, id=property_id)
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()

            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)

            from .models import DpPropertyCompetitor
            property_competitors = DpPropertyCompetitor.objects.filter(
                property_id=property_instance,
                deleted_at__isnull=True
            ).select_related('competitor_id').order_by('created_at')

            serializer = PropertyCompetitorSerializer(property_competitors, many=True)

            print(f"Retrieved {len(property_competitors)} processed competitors for property {property_id}")

            return Response({
                'competitors': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)

        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Error retrieving property competitors: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving property competitors',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompetitorCandidateUpdateView(APIView):
    """
    API endpoint for updating competitor candidates
    """
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, property_id, candidate_id):
        """
        Update a competitor candidate's name or URL
        """
        print(f"🔍 CompetitorCandidateUpdateView.patch called")
        print(f"📊 Request data: {request.data}")
        print(f"📊 Property ID: {property_id}")
        print(f"📊 Candidate ID: {candidate_id}")
        print(f"📊 User: {request.user}")
        
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            print(f"✅ Property found: {property_instance.name}")
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                print(f"❌ User {request.user} does not have access to property {property_id}")
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            print(f"✅ User has access to property")
            
            # Get the competitor candidate
            from .models import CompetitorCandidate
            candidate = get_object_or_404(CompetitorCandidate, 
                                        id=candidate_id, 
                                        property_id=property_instance,
                                        deleted=False)
            
            print(f"✅ Candidate found: {candidate.competitor_name}")
            print(f"📊 Current candidate data: name='{candidate.competitor_name}', booking_link='{candidate.booking_link}'")
            
            # Update fields
            if 'competitor_name' in request.data:
                old_name = candidate.competitor_name
                candidate.competitor_name = request.data['competitor_name']
                print(f"📝 Updating competitor_name: '{old_name}' -> '{candidate.competitor_name}'")
            
            if 'booking_link' in request.data:
                old_link = candidate.booking_link
                candidate.booking_link = request.data['booking_link']
                print(f"📝 Updating booking_link: '{old_link}' -> '{candidate.booking_link}'")
            
            candidate.save()
            print(f"💾 Candidate saved to database")
            
            serializer = CompetitorCandidateSerializer(candidate)
            
            print(f"✅ Updated competitor candidate {candidate_id} for property {property_id}")
            print(f"📊 Final candidate data: {serializer.data}")
            
            return Response({
                'message': 'Competitor candidate updated successfully',
                'candidate': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except CompetitorCandidate.DoesNotExist:
            return Response({
                'message': 'Competitor candidate not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"❌ Error updating competitor candidate: {str(e)}")
            print(f"❌ Exception type: {type(e)}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            return Response({
                'message': 'An error occurred while updating the competitor candidate',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PropertyCompetitorUpdateView(APIView):
    """
    API endpoint for updating processed competitors
    """
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, property_id, competitor_id):
        """
        Update a processed competitor's name, URL, or only_follow status
        """
        print(f"🔍 PropertyCompetitorUpdateView.patch called")
        print(f"📊 Request data: {request.data}")
        print(f"📊 Property ID: {property_id}")
        print(f"📊 Competitor ID: {competitor_id}")
        print(f"📊 User: {request.user}")
        
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            print(f"✅ Property found: {property_instance.name}")
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                print(f"❌ User {request.user} does not have access to property {property_id}")
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            print(f"✅ User has access to property")
            
            # Get the property competitor relationship
            from .models import DpPropertyCompetitor
            property_competitor = get_object_or_404(DpPropertyCompetitor, 
                                                  id=competitor_id, 
                                                  property_id=property_instance,
                                                  deleted_at__isnull=True)
            
            print(f"✅ Property competitor found: {property_competitor.id}")
            
            # Update only_follow if provided
            if 'only_follow' in request.data:
                old_only_follow = property_competitor.only_follow
                property_competitor.only_follow = request.data['only_follow']
                property_competitor.save()
                print(f"📝 Updating only_follow: {old_only_follow} -> {property_competitor.only_follow}")
            
            # Update competitor details if provided
            competitor = property_competitor.competitor_id
            print(f"📊 Current competitor data: name='{competitor.competitor_name}', booking_link='{competitor.booking_link}'")
            
            if 'competitor_name' in request.data:
                old_name = competitor.competitor_name
                competitor.competitor_name = request.data['competitor_name']
                competitor.save()
                print(f"📝 Updating competitor_name: '{old_name}' -> '{competitor.competitor_name}'")
            
            if 'booking_link' in request.data:
                old_link = competitor.booking_link
                competitor.booking_link = request.data['booking_link']
                competitor.save()
                print(f"📝 Updating booking_link: '{old_link}' -> '{competitor.booking_link}'")
            
            print(f"💾 Competitor saved to database")
            
            serializer = PropertyCompetitorSerializer(property_competitor)
            print(f"📊 Final competitor data: {serializer.data}")
            
            print(f"Updated property competitor {competitor_id} for property {property_id}")
            
            return Response({
                'message': 'Property competitor updated successfully',
                'competitor': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except DpPropertyCompetitor.DoesNotExist:
            return Response({
                'message': 'Property competitor not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"❌ Error updating property competitor: {str(e)}")
            print(f"❌ Exception type: {type(e)}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            return Response({
                'message': 'An error occurred while updating the property competitor',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompetitorCandidateDeleteView(APIView):
    """
    API endpoint for deleting competitor candidates (soft delete)
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, property_id, candidate_id):
        """
        Soft delete a competitor candidate by setting deleted=True
        """
        print(f"🔍 CompetitorCandidateDeleteView.delete called")
        print(f"📊 Property ID: {property_id}")
        print(f"📊 Candidate ID: {candidate_id}")
        print(f"📊 User: {request.user}")
        
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            print(f"✅ Property found: {property_instance.name}")
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                print(f"❌ User {request.user} does not have access to property {property_id}")
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            print(f"✅ User has access to property")
            
            # Get the competitor candidate
            from .models import CompetitorCandidate
            candidate = get_object_or_404(CompetitorCandidate, 
                                        id=candidate_id, 
                                        property_id=property_instance)
            
            print(f"✅ Candidate found: {candidate.competitor_name}")
            print(f"📊 Current deleted status: {candidate.deleted}")
            
            # Soft delete the candidate
            candidate.deleted = True
            candidate.save()
            
            print(f"💾 Candidate soft deleted successfully")
            
            return Response({
                'message': 'Competitor candidate deleted successfully',
                'candidate_id': candidate_id,
                'competitor_name': candidate.competitor_name
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except CompetitorCandidate.DoesNotExist:
            return Response({
                'message': 'Competitor candidate not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"❌ Error deleting competitor candidate: {str(e)}")
            print(f"❌ Exception type: {type(e)}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            return Response({
                'message': 'An error occurred while deleting the competitor candidate',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PropertyCompetitorDeleteView(APIView):
    """
    API endpoint for deleting processed competitors (soft delete)
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, property_id, competitor_id):
        """
        Soft delete a processed competitor by setting deleted_at timestamp
        """
        print(f"🔍 PropertyCompetitorDeleteView.delete called")
        print(f"📊 Property ID: {property_id}")
        print(f"📊 Competitor ID: {competitor_id}")
        print(f"📊 User: {request.user}")
        
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            print(f"✅ Property found: {property_instance.name}")
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                print(f"❌ User {request.user} does not have access to property {property_id}")
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            print(f"✅ User has access to property")
            
            # Get the property competitor relationship
            from .models import DpPropertyCompetitor
            property_competitor = get_object_or_404(DpPropertyCompetitor, 
                                                  id=competitor_id, 
                                                  property_id=property_instance,
                                                  deleted_at__isnull=True)
            
            print(f"✅ Property competitor found: {property_competitor.id}")
            print(f"📊 Competitor name: {property_competitor.competitor_id.competitor_name}")
            print(f"📊 Current deleted_at: {property_competitor.deleted_at}")
            
            # Soft delete the competitor by setting deleted_at timestamp
            from django.utils import timezone
            property_competitor.deleted_at = timezone.now()
            property_competitor.save()
            
            print(f"💾 Property competitor soft deleted successfully")
            
            return Response({
                'message': 'Property competitor deleted successfully',
                'competitor_id': competitor_id,
                'competitor_name': property_competitor.competitor_id.competitor_name
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except DpPropertyCompetitor.DoesNotExist:
            return Response({
                'message': 'Property competitor not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"❌ Error deleting property competitor: {str(e)}")
            print(f"❌ Exception type: {type(e)}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            return Response({
                'message': 'An error occurred while deleting the property competitor',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OfferIncrementsListView(APIView):
    """
    API endpoint for listing offer increments (special offers) for a property
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Retrieve all offer increments for a specific property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get all offer increments for this property
            offer_increments = DpOfferIncrements.objects.filter(
                property_id=property_instance
            ).order_by('-created_at')
            
            serializer = OfferIncrementsSerializer(offer_increments, many=True)
            
            return Response({
                'offers': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving offer increments: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving offer increments',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OfferIncrementsCreateView(APIView):
    """
    API endpoint for creating offer increments (special offers)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, property_id):
        """
        Create new offer increments for a specific property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if this is a bulk create request
            if 'offers' in request.data:
                # Bulk create multiple offers
                serializer = BulkOfferIncrementsSerializer(
                    data=request.data, 
                    context={'request': request}
                )
                
                if serializer.is_valid():
                    result = serializer.save()
                    
                    # Serialize the created offers for response
                    created_offers_data = OfferIncrementsSerializer(
                        result['created_offers'], 
                        many=True
                    ).data
                    
                    return Response({
                        'message': f"Successfully created {len(result['created_offers'])} offer increments",
                        'created_offers': created_offers_data,
                        'errors': result.get('errors', []),
                        'property_id': result['property_id']
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        'message': 'Validation error',
                        'errors': serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Single offer create
                data = request.data.copy()
                data['property_id'] = property_instance.id
                
                serializer = OfferIncrementsSerializer(data=data, context={'request': request})
                
                if serializer.is_valid():
                    offer_increment = serializer.save()
                    
                    return Response({
                        'message': 'Offer increment created successfully',
                        'offer': OfferIncrementsSerializer(offer_increment).data
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        'message': 'Validation error',
                        'errors': serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error creating offer increment: {str(e)}")
            return Response({
                'message': 'An error occurred while creating the offer increment',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OfferIncrementsUpdateView(APIView):
    """
    API endpoint for updating offer increments (special offers)
    """
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, property_id, offer_id):
        """
        Update an existing offer increment
        """
        print(f"🔧 DEBUG: PATCH request received for special offer update")
        print(f"🔧 DEBUG: Property ID: {property_id}")
        print(f"🔧 DEBUG: Offer ID: {offer_id}")
        print(f"🔧 DEBUG: Request data: {request.data}")
        print(f"🔧 DEBUG: User: {request.user}")
        
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            print(f"🔧 DEBUG: Property found: {property_instance.name}")
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            print(f"🔧 DEBUG: User has access to {user_properties.count()} properties")
            
            if not user_properties.filter(id=property_id).exists():
                print(f"🔧 DEBUG: User does not have access to property {property_id}")
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            print(f"🔧 DEBUG: User has access to property {property_id}")
            
            # Get the offer increment
            offer_increment = get_object_or_404(
                DpOfferIncrements, 
                id=offer_id, 
                property_id=property_instance
            )
            print(f"🔧 DEBUG: Offer increment found: ID {offer_increment.id}, Name: {offer_increment.offer_name}")
            
            serializer = OfferIncrementsSerializer(
                offer_increment, 
                data=request.data, 
                partial=True,
                context={'request': request}
            )
            
            print(f"🔧 DEBUG: Serializer created with data: {request.data}")
            print(f"🔧 DEBUG: Serializer is_valid(): {serializer.is_valid()}")
            
            if serializer.is_valid():
                print(f"🔧 DEBUG: Serializer is valid, saving...")
                updated_offer = serializer.save()
                print(f"🔧 DEBUG: Offer saved successfully: {updated_offer.id}")
                
                return Response({
                    'message': 'Offer increment updated successfully',
                    'offer': OfferIncrementsSerializer(updated_offer).data
                }, status=status.HTTP_200_OK)
            else:
                print(f"🔧 DEBUG: Serializer validation failed")
                print(f"🔧 DEBUG: Serializer errors: {serializer.errors}")
                return Response({
                    'message': 'Validation error',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Property.DoesNotExist:
            print(f"🔧 DEBUG: Property not found: {property_id}")
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except DpOfferIncrements.DoesNotExist:
            print(f"🔧 DEBUG: Offer increment not found: {offer_id}")
            return Response({
                'message': 'Offer increment not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"🔧 DEBUG: Exception occurred: {str(e)}")
            import traceback
            print(f"🔧 DEBUG: Traceback: {traceback.format_exc()}")
            logger.error(f"Error updating offer increment: {str(e)}")
            return Response({
                'message': 'An error occurred while updating the offer increment',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OfferIncrementsDeleteView(APIView):
    """
    API endpoint for deleting offer increments (special offers)
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, property_id, offer_id):
        """
        Delete an offer increment
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get the offer increment
            offer_increment = get_object_or_404(
                DpOfferIncrements, 
                id=offer_id, 
                property_id=property_instance
            )
            
            offer_name = offer_increment.offer_name
            offer_increment.delete()
            
            return Response({
                'message': 'Offer increment deleted successfully',
                'offer_id': offer_id,
                'offer_name': offer_name
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except DpOfferIncrements.DoesNotExist:
            return Response({
                'message': 'Offer increment not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error deleting offer increment: {str(e)}")
            return Response({
                'message': 'An error occurred while deleting the offer increment',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DynamicIncrementsV2ListView(APIView):
    """
    API endpoint for listing dynamic increments v2 (dynamic setup) for a property
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Retrieve all dynamic increments for a specific property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get all dynamic increments for this property
            dynamic_increments = DpDynamicIncrementsV2.objects.filter(
                property_id=property_instance
            ).order_by('-created_at')
            
            serializer = DynamicIncrementsV2Serializer(dynamic_increments, many=True)
            
            return Response({
                'rules': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving dynamic increments: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving dynamic increments',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DynamicIncrementsV2CreateView(APIView):
    """
    API endpoint for creating dynamic increments v2 (dynamic setup)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, property_id):
        """
        Create new dynamic increments for a specific property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if this is a bulk create request
            if 'rules' in request.data:
                # Bulk create multiple rules
                serializer = BulkDynamicIncrementsV2Serializer(
                    data=request.data, 
                    context={'request': request}
                )
                
                if serializer.is_valid():
                    result = serializer.save()
                    
                    # Serialize the created rules for response
                    created_rules_data = DynamicIncrementsV2Serializer(
                        result['created_rules'], 
                        many=True
                    ).data
                    
                    return Response({
                        'message': f"Successfully created {len(result['created_rules'])} dynamic increments",
                        'created_rules': created_rules_data,
                        'errors': result.get('errors', []),
                        'property_id': result['property_id']
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        'message': 'Validation error',
                        'errors': serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Single rule create
                data = request.data.copy()
                data['property_id'] = property_instance.id
                
                serializer = DynamicIncrementsV2Serializer(data=data, context={'request': request})
                
                if serializer.is_valid():
                    dynamic_increment = serializer.save()
                    
                    return Response({
                        'message': 'Dynamic increment created successfully',
                        'rule': DynamicIncrementsV2Serializer(dynamic_increment).data
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        'message': 'Validation error',
                        'errors': serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error creating dynamic increment: {str(e)}")
            return Response({
                'message': 'An error occurred while creating the dynamic increment',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DynamicIncrementsV2UpdateView(APIView):
    """
    API endpoint for updating dynamic increments v2 (dynamic setup)
    """
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, property_id, rule_id):
        """
        Update an existing dynamic increment
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get the dynamic increment
            dynamic_increment = get_object_or_404(
                DpDynamicIncrementsV2, 
                id=rule_id, 
                property_id=property_instance
            )
            
            serializer = DynamicIncrementsV2Serializer(
                dynamic_increment, 
                data=request.data, 
                partial=True,
                context={'request': request}
            )
            
            if serializer.is_valid():
                updated_rule = serializer.save()
                
                return Response({
                    'message': 'Dynamic increment updated successfully',
                    'rule': DynamicIncrementsV2Serializer(updated_rule).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'message': 'Validation error',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except DpDynamicIncrementsV2.DoesNotExist:
            return Response({
                'message': 'Dynamic increment not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error updating dynamic increment: {str(e)}")
            return Response({
                'message': 'An error occurred while updating the dynamic increment',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DynamicIncrementsV2DeleteView(APIView):
    """
    API endpoint for deleting dynamic increments v2 (dynamic setup)
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, property_id, rule_id):
        """
        Delete a dynamic increment
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get the dynamic increment
            dynamic_increment = get_object_or_404(
                DpDynamicIncrementsV2, 
                id=rule_id, 
                property_id=property_instance
            )
            
            occupancy_category = dynamic_increment.get_occupancy_category_display()
            lead_time_category = dynamic_increment.get_lead_time_category_display()
            dynamic_increment.delete()
            
            return Response({
                'message': 'Dynamic increment deleted successfully',
                'rule_id': rule_id,
                'occupancy_category': occupancy_category,
                'lead_time_category': lead_time_category
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except DpDynamicIncrementsV2.DoesNotExist:
            return Response({
                'message': 'Dynamic increment not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error deleting dynamic increment: {str(e)}")
            return Response({
                'message': 'An error occurred while deleting the dynamic increment',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LosReductionListView(APIView):
    """
    API endpoint for listing LOS reduction rules for a property
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Retrieve all LOS reduction rules for a specific property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get all LOS reduction rules for this property
            los_reductions = DpLosReduction.objects.filter(
                property_id=property_instance
            ).order_by('-created_at')
            
            serializer = DpLosReductionSerializer(los_reductions, many=True)
            
            return Response({
                'reductions': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving LOS reduction rules: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving LOS reduction rules',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LosReductionCreateView(APIView):
    """
    API endpoint for creating a single LOS reduction rule
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, property_id):
        """
        Create a new LOS reduction rule for a specific property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Prepare data for single rule creation
            data = request.data.copy()
            data['property_id'] = property_instance.id
            # Remove user field since it doesn't exist in the model
            data.pop('user', None)
            
            serializer = DpLosReductionSerializer(data=data, context={'request': request})
            
            if serializer.is_valid():
                los_reduction = serializer.save()
                
                return Response({
                    'message': 'LOS reduction rule created successfully',
                    'reduction': DpLosReductionSerializer(los_reduction).data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'message': 'Validation error',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error creating LOS reduction rule: {str(e)}")
            return Response({
                'message': 'An error occurred while creating the LOS reduction rule',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LosReductionUpdateView(APIView):
    """
    API endpoint for updating LOS reduction rules
    """
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, property_id, reduction_id):
        """
        Update an existing LOS reduction rule
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get the LOS reduction rule
            los_reduction = get_object_or_404(
                DpLosReduction, 
                id=reduction_id, 
                property_id=property_instance
            )
            
            serializer = DpLosReductionSerializer(
                los_reduction, 
                data=request.data, 
                partial=True
            )
            
            if serializer.is_valid():
                updated_reduction = serializer.save()
                
                return Response({
                    'message': 'LOS reduction rule updated successfully',
                    'reduction': DpLosReductionSerializer(updated_reduction).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'message': 'Validation error',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except DpLosReduction.DoesNotExist:
            return Response({
                'message': 'LOS reduction rule not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error updating LOS reduction rule: {str(e)}")
            return Response({
                'message': 'An error occurred while updating the LOS reduction rule',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LosReductionDeleteView(APIView):
    """
    API endpoint for deleting LOS reduction rules
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, property_id, reduction_id):
        """
        Delete a LOS reduction rule
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get the LOS reduction rule
            los_reduction = get_object_or_404(
                DpLosReduction, 
                id=reduction_id, 
                property_id=property_instance
            )
            
            # Get the values before deleting
            lead_time_days = los_reduction.lead_time_days
            occupancy_level = los_reduction.occupancy_level
            los_reduction.delete()
            
            return Response({
                'message': 'LOS reduction rule deleted successfully',
                'reduction_id': reduction_id,
                'lead_time_days': lead_time_days,
                'occupancy_level': occupancy_level
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except DpLosReduction.DoesNotExist:
            return Response({
                'message': 'LOS reduction rule not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error deleting LOS reduction rule: {str(e)}")
            return Response({
                'message': 'An error occurred while deleting the LOS reduction rule',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LosSetupListView(APIView):
    """
    API endpoint for listing LOS setup rules for a property
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Retrieve all LOS setup rules for a specific property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get all LOS setup rules for this property
            los_setups = DpLosSetup.objects.filter(
                property_id=property_instance
            ).order_by('-created_at')
            
            serializer = DpLosSetupSerializer(los_setups, many=True)
            
            return Response({
                'setups': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving LOS setup rules: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving LOS setup rules',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LosSetupCreateView(APIView):
    """
    API endpoint for creating a single LOS setup rule
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, property_id):
        """
        Create a new LOS setup rule for a specific property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Prepare data for single rule creation
            data = request.data.copy()
            data['property_id'] = property_instance.id
            
            serializer = DpLosSetupSerializer(data=data, context={'request': request})
            
            if serializer.is_valid():
                los_setup = serializer.save()
                
                return Response({
                    'message': 'LOS setup rule created successfully',
                    'setup': DpLosSetupSerializer(los_setup).data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'message': 'Validation error',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error creating LOS setup rule: {str(e)}")
            return Response({
                'message': 'An error occurred while creating the LOS setup rule',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LosSetupUpdateView(APIView):
    """
    API endpoint for updating LOS setup rules
    """
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, property_id, setup_id):
        """
        Update an existing LOS setup rule
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get the LOS setup rule
            los_setup = get_object_or_404(
                DpLosSetup, 
                id=setup_id, 
                property_id=property_instance
            )
            
            serializer = DpLosSetupSerializer(
                los_setup, 
                data=request.data, 
                partial=True
            )
            
            if serializer.is_valid():
                updated_setup = serializer.save()
                
                return Response({
                    'message': 'LOS setup rule updated successfully',
                    'setup': DpLosSetupSerializer(updated_setup).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'message': 'Validation error',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except DpLosSetup.DoesNotExist:
            return Response({
                'message': 'LOS setup rule not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error updating LOS setup rule: {str(e)}")
            return Response({
                'message': 'An error occurred while updating the LOS setup rule',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LosSetupDeleteView(APIView):
    """
    API endpoint for deleting LOS setup rules
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, property_id, setup_id):
        """
        Delete a LOS setup rule
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get the LOS setup rule
            los_setup = get_object_or_404(
                DpLosSetup, 
                id=setup_id, 
                property_id=property_instance
            )
            
            day_of_week = los_setup.day_of_week
            valid_from = los_setup.valid_from
            los_setup.delete()
            
            return Response({
                'message': 'LOS setup rule deleted successfully',
                'setup_id': setup_id,
                'day_of_week': day_of_week,
                'valid_from': valid_from
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except DpLosSetup.DoesNotExist:
            return Response({
                'message': 'LOS setup rule not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error deleting LOS setup rule: {str(e)}")
            return Response({
                'message': 'An error occurred while deleting the LOS setup rule',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PropertyAvailableRatesView(APIView):
    """
    API endpoint to get available rates (UnifiedRoomsAndRates) for a property
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Get all available rates for a specific property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get all available rates for this property
            available_rates = UnifiedRoomsAndRates.objects.filter(
                property_id=property_instance
            ).order_by('room_id', 'rate_id')
            
            # Serialize the data using the unified serializer
            serializer = AvailableRatesUnifiedSerializer(available_rates, many=True)
            
            return Response({
                'rates': serializer.data,
                'count': available_rates.count()
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error fetching available rates: {str(e)}")
            return Response({
                'message': 'An error occurred while fetching available rates',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PropertyAvailableRatesUpdateView(APIView):
    """
    API endpoint to update available rates configuration (DpRoomRates) for a property
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, property_id):
        """
        Update available rates configuration for a specific property
        """
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Validate the request data
            serializer = BulkAvailableRatesUpdateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'message': 'Invalid data provided',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data
            rates_data = validated_data['rates']
            
            updated_rates = []
            created_rates = []
            errors = []
            
            # Process each rate configuration
            for rate_data in rates_data:
                try:
                    rate_id = rate_data['rate_id']
                    increment_type = rate_data['increment_type']
                    increment_value = rate_data['increment_value']
                    is_base_rate = rate_data['is_base_rate']
                    
                    # If this rate is being set as base rate, unset all other base rates for this property
                    if is_base_rate:
                        DpRoomRates.objects.filter(
                            property_id=property_instance,
                            user=request.user
                        ).update(is_base_rate=False)
                    
                    # Get or create the DpRoomRates object
                    room_rate, created = DpRoomRates.objects.get_or_create(
                        property_id=property_instance,
                        user=request.user,
                        rate_id=rate_id,
                        defaults={
                            'increment_type': increment_type,
                            'increment_value': increment_value,
                            'is_base_rate': is_base_rate
                        }
                    )
                    
                    if not created:
                        # Update existing record
                        room_rate.increment_type = increment_type
                        room_rate.increment_value = increment_value
                        room_rate.is_base_rate = is_base_rate
                        room_rate.save()
                        updated_rates.append(room_rate)
                    else:
                        created_rates.append(room_rate)
                        
                except Exception as e:
                    errors.append({
                        'rate_id': rate_data.get('rate_id', 'unknown'),
                        'error': str(e)
                    })
            
            return Response({
                'message': 'Available rates configuration updated successfully',
                'property_id': property_instance.id,
                'updated_count': len(updated_rates),
                'created_count': len(created_rates),
                'total_processed': len(rates_data),
                'errors': errors
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error updating available rates: {str(e)}")
            return Response({
                'message': 'An error occurred while updating available rates',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
