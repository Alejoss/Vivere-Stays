from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
import logging
import time
from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import DpMinimumSellingPrice, Property
from .serializers import MinimumSellingPriceSerializer
import requests
from decouple import config
from django.conf import settings
from vivere_stays.logging_utils import get_logger, log_operation, log_api_call, LogLevel, LoggerNames

from .models import Property, PropertyManagementSystem, DpMinimumSellingPrice, DpPriceChangeHistory, DpGeneralSettings, DpOfferIncrements, DpDynamicIncrementsV2, DpLosReduction, DpLosSetup, DpRoomRates, UnifiedRoomsAndRates, Competitor, DpPropertyCompetitor, OverwritePriceHistory
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
    BulkUpdateDynamicIncrementsV2Serializer,
    DynamicIncrementsV2Serializer,
    BulkDynamicIncrementsV2Serializer,
    DpLosReductionSerializer,
    BulkDpLosReductionSerializer,
    DpLosSetupSerializer,
    BulkDpLosSetupSerializer,
    UnifiedRoomsAndRatesSerializer,
    AvailableRatesUnifiedSerializer,
    BulkAvailableRatesUpdateSerializer,
    CompetitorCreateSerializer,
    CompetitorDetailSerializer,
    CompetitorListSerializer,
    BulkCompetitorCreateSerializer,
    OverwritePriceHistorySerializer
)

from rest_framework.decorators import action
from .models import DpHistoricalCompetitorPrice
from .serializers import HistoricalCompetitorPriceSerializer
from django.db import models
import requests

# Get logger for dynamic_pricing views
logger = get_logger(LoggerNames.DYNAMIC_PRICING)


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
            user_profile = request.user.profile
            
            # Check if user has access to this property
            if not user_profile.properties.filter(id=property_id).exists():
                logger.warning(f"User {request.user.username} attempted to access property {property_id} without ownership")
                return Response({
                    'message': 'Property not found or access denied'
                }, status=status.HTTP_404_NOT_FOUND)

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
    
    def get(self, request, property_id, msp_id=None):
        """
        Get MSP entries for a specific property, optionally for a specific MSP entry
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
            
            if msp_id:
                # Get specific MSP entry
                msp_entry = get_object_or_404(
                    DpMinimumSellingPrice,
                    id=msp_id,
                    property_id=property_instance
                )
                serializer = MinimumSellingPriceSerializer(msp_entry)
                
                return Response({
                    'msp_entry': serializer.data,
                    'property_id': property_id,
                    'property_name': property_instance.name
                }, status=status.HTTP_200_OK)
            else:
                # Get all MSP entries for the property
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
        except DpMinimumSellingPrice.DoesNotExist:
            return Response({
                'message': 'MSP entry not found'
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
            
            if not user_profile.properties.filter(id=property_id).exists():
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
            new_entries_to_create = []  # Collect new entries for bulk_create
            entries_to_update = []  # Collect existing entries for bulk_update
            
            # Pre-fetch all existing entries in one query (optimization)
            existing_entry_ids = []
            for period in periods:
                period_id = period.get('id', '')
                if period_id.startswith('existing-'):
                    db_id = period_id.replace('existing-', '')
                    existing_entry_ids.append(db_id)
            
            existing_entries_dict = {}
            if existing_entry_ids:
                existing_entries = DpMinimumSellingPrice.objects.filter(
                    id__in=existing_entry_ids,
                    property_id=property_instance
                )
                existing_entries_dict = {str(entry.id): entry for entry in existing_entries}
            
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
                        
                        # Get entry from pre-fetched dictionary
                        existing_entry = existing_entries_dict.get(db_id)
                        if not existing_entry:
                            errors.append(f"Could not find existing MSP entry with ID: {db_id}")
                            continue
                        
                        # Update the fields
                        existing_entry.valid_from = from_date
                        existing_entry.valid_until = to_date
                        existing_entry.msp = price
                        existing_entry.period_title = period_title
                        
                        entries_to_update.append(existing_entry)
                    else:
                        # Collect new entries for bulk_create (fast manual validation)
                        # Validate date range (allow equal dates for one-day periods)
                        if from_date > to_date:
                            errors.append(f"Invalid date range for period: {period.get('fromDate')} to {period.get('toDate')}")
                            continue
                        
                        # Validate MSP value
                        if price < 0:
                            errors.append(f"Invalid price value for period {period}: MSP cannot be negative")
                            continue
                        
                        # Store validated data for bulk_create (use Property object for model instance)
                        new_entries_to_create.append(DpMinimumSellingPrice(
                            property_id=property_instance,
                            user=request.user,
                            valid_from=from_date,
                            valid_until=to_date,
                            msp=price,
                            period_title=period_title
                        ))
                        
                except ValueError as e:
                    errors.append(f"Invalid price value for period {period}: {str(e)}")
                except Exception as e:
                    errors.append(f"Error processing period {period}: {str(e)}")
            
            # Bulk update existing entries
            if entries_to_update:
                DpMinimumSellingPrice.objects.bulk_update(
                    entries_to_update,
                    ['valid_from', 'valid_until', 'msp', 'period_title']
                )
                
                # Serialize the updated entries for response
                for entry in entries_to_update:
                    updated_msp_entries.append({
                        'id': str(entry.id),
                        'valid_from': entry.valid_from,
                        'valid_until': entry.valid_until,
                        'msp': entry.msp,
                        'period_title': entry.period_title
                    })
            
            # Bulk create all new entries at once
            if new_entries_to_create:
                created_objects = DpMinimumSellingPrice.objects.bulk_create(new_entries_to_create)
                
                # Serialize the created entries for response
                for entry in created_objects:
                    created_msp_entries.append({
                        'id': str(entry.id),
                        'valid_from': entry.valid_from,
                        'valid_until': entry.valid_until,
                        'msp': entry.msp,
                        'period_title': entry.period_title
                    })
            
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
    
    def delete(self, request, property_id, msp_id):
        """
        Delete a specific MSP entry for a property
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
            
            # Get the MSP entry
            msp_entry = get_object_or_404(
                DpMinimumSellingPrice,
                id=msp_id,
                property_id=property_instance
            )
            
            # Store data for response before deletion
            deleted_data = {
                'id': msp_entry.id,
                'valid_from': msp_entry.valid_from,
                'valid_until': msp_entry.valid_until,
                'msp': msp_entry.msp,
                'period_title': msp_entry.period_title
            }
            
            # Delete the MSP entry
            msp_entry.delete()
            
            logger.info(f"MSP entry {msp_id} deleted successfully for property {property_id}")
            
            return Response({
                'message': 'MSP entry deleted successfully',
                'deleted_entry': deleted_data
            }, status=status.HTTP_200_OK)
            
        except Property.DoesNotExist:
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except DpMinimumSellingPrice.DoesNotExist:
            return Response({
                'message': 'MSP entry not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error deleting MSP entry {msp_id} for property {property_id}: {str(e)}")
            return Response({
                'message': 'An error occurred while deleting the MSP entry',
                'error': str(e)
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
                'msp': 100
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
        year = request.GET.get('year')
        month = request.GET.get('month')
        
        log_operation(
            logger, LogLevel.INFO, 
            f"Price history requested for property {property_id}",
            "price_history_request",
            request, request.user,
            property_id=property_id, year=year, month=month
        )
        
        try:
            user_profile = request.user.profile
            
            # Get user's properties for debugging
            user_properties = user_profile.get_properties()
            user_property_ids = list(user_properties.values_list('id', flat=True))
            
            log_operation(
                logger, LogLevel.DEBUG,
                f"User has {user_properties.count()} properties",
                "user_properties_check",
                request, request.user,
                property_count=user_properties.count(),
                user_property_ids=user_property_ids
            )
            
            if not user_profile.properties.filter(id=property_id).exists():
                log_operation(
                    logger, LogLevel.WARNING,
                    f"Access denied - Property {property_id} not found in user's properties",
                    "property_access_denied",
                    request, request.user,
                    property_id=property_id,
                    user_property_ids=user_property_ids
                )
                return Response({
                    'message': 'Property not found or access denied'
                }, status=status.HTTP_404_NOT_FOUND)

            log_operation(
                logger, LogLevel.INFO,
                f"Access granted to property {property_id}",
                "property_access_granted",
                request, request.user,
                property_id=property_id
            )
            
            property_obj = get_object_or_404(Property, id=property_id)
            
            log_operation(
                logger, LogLevel.DEBUG,
                f"Property found: {property_obj.name}",
                "property_retrieved",
                request, request.user,
                property_id=property_id,
                property_name=property_obj.name
            )

            year = request.query_params.get('year', timezone.now().year)
            month = request.query_params.get('month', timezone.now().month)
            
            try:
                year = int(year)
                month = int(month)
                
                log_operation(
                    logger, LogLevel.DEBUG,
                    f"Query params parsed successfully",
                    "query_params_parsed",
                    request, request.user,
                    year=year, month=month
                )
            except ValueError:
                log_operation(
                    logger, LogLevel.WARNING,
                    f"Invalid year/month parameters: {year}, {month}",
                    "invalid_query_params",
                    request, request.user,
                    year=year, month=month
                )
                return Response({
                    'message': 'Invalid year or month parameter'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calculate date range for the month
            start_date = datetime(year, month, 1).date()
            if month == 12:
                end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
            else:
                end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)

            # Single bulk query for the month, reduce to latest per checkin_date
            qs = (
                DpPriceChangeHistory.objects
                .filter(
                    property_id=property_id,
                    checkin_date__gte=start_date,
                    checkin_date__lte=end_date,
                )
                .order_by('checkin_date', '-as_of')
            )
            latest_by_date = {}
            for row in qs:
                if row.checkin_date not in latest_by_date:
                    latest_by_date[row.checkin_date] = row
            
            # Prefetch all overwrites in one query to avoid N+1 in serializer
            overwrites = {
                (o.checkin_date, str(o.property_id)): o.overwrite_price
                for o in OverwritePriceHistory.objects.filter(
                    property=property_obj,
                    checkin_date__gte=start_date,
                    checkin_date__lte=end_date
                )
            }
            
            # Serialize with prefetched overwrite data
            price_history = [
                PriceHistorySerializer(obj, context={'overwrites': overwrites}).data 
                for obj in latest_by_date.values()
            ]
            price_history.sort(key=lambda x: x['checkin_date'])
            
            log_operation(
                logger, LogLevel.INFO,
                f"Returning {len(price_history)} price history entries",
                "price_history_retrieved",
                request, request.user,
                property_id=property_id,
                entry_count=len(price_history)
            )

            response_data = {
                'property_id': property_id,
                'property_name': property_obj.name,
                'year': year,
                'month': month,
                'price_history': price_history,
                'count': len(price_history)
            }
            
            log_operation(
                logger, LogLevel.INFO,
                f"Successfully returning response with {len(price_history)} entries",
                "price_history_success",
                request, request.user,
                property_id=property_id,
                entry_count=len(price_history)
            )
            
            return Response(response_data, status=status.HTTP_200_OK)
        except Property.DoesNotExist:
            log_operation(
                logger, LogLevel.WARNING,
                f"Property {property_id} does not exist in database",
                "property_not_found",
                request, request.user,
                property_id=property_id
            )
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            log_operation(
                logger, LogLevel.ERROR,
                f"Exception occurred while retrieving price history: {str(e)}",
                "price_history_error",
                request, request.user,
                property_id=property_id,
                error=str(e)
            )
            return Response({
                'message': 'An error occurred while retrieving price history',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MSPPriceHistoryView(APIView):
    """
    API endpoint for retrieving MSP price history data for a property
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Retrieve MSP price history data for a specific property
        Returns the MSP values from DpPriceChangeHistory for each checkin_date
        """
        year = request.GET.get('year')
        month = request.GET.get('month')
        print(f"[DEBUG] MSP Price History requested for property {property_id}, year {year}, month {month}")
        print(f"[MSPPriceHistoryView] GET request - User: {request.user.username}, Property ID: {property_id}")
        logger.info(f"MSP price history requested - User: {request.user.username}, Property ID: {property_id}")
        
        try:
            user_profile = request.user.profile
            print(f"[MSPPriceHistoryView] User profile ID: {user_profile.id}")
            
            # Get user's properties for debugging
            user_properties = user_profile.get_properties()
            user_property_ids = list(user_properties.values_list('id', flat=True))
            print(f"[MSPPriceHistoryView] User has {user_properties.count()} properties: {user_property_ids}")
            logger.info(f"User {request.user.username} has {user_properties.count()} properties: {user_property_ids}")
            
            if not user_profile.properties.filter(id=property_id).exists():
                print(f"[MSPPriceHistoryView] ACCESS DENIED - Property {property_id} not found in user's properties")
                logger.warning(f"User {request.user.username} attempted to access property {property_id} without ownership. User properties: {user_property_ids}")
                return Response({
                    'message': 'Property not found or access denied'
                }, status=status.HTTP_404_NOT_FOUND)

            print(f"[MSPPriceHistoryView] ACCESS GRANTED - Property {property_id} found in user's properties")
            logger.info(f"Access granted to property {property_id} for user {request.user.username}")
            
            property_obj = get_object_or_404(Property, id=property_id)
            print(f"[MSPPriceHistoryView] Property found: {property_obj.name}")

            year = request.query_params.get('year', timezone.now().year)
            month = request.query_params.get('month', timezone.now().month)
            print(f"[MSPPriceHistoryView] Query params - Year: {year}, Month: {month}")
            try:
                year = int(year)
                month = int(month)
                print(f"[MSPPriceHistoryView] Parsed params - Year: {year}, Month: {month}")
            except ValueError:
                print(f"[MSPPriceHistoryView] Invalid year/month parameters: {year}, {month}")
                return Response({
                    'message': 'Invalid year or month parameter'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calculate date range for the month
            start_date = datetime(year, month, 1).date()
            if month == 12:
                end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
            else:
                end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)

            # Single bulk query for the month, reduce to latest per checkin_date
            qs = (
                DpPriceChangeHistory.objects
                .filter(
                    property_id=property_id,
                    checkin_date__gte=start_date,
                    checkin_date__lte=end_date,
                )
                .order_by('checkin_date', '-as_of')
            )
            latest_by_date = {}
            for row in qs:
                if row.checkin_date not in latest_by_date:
                    latest_by_date[row.checkin_date] = row
            msp_price_history = []
            for row in latest_by_date.values():
                normalized_occupancy = self._normalize_occupancy(row.occupancy)
                msp_price_history.append({
                    'checkin_date': row.checkin_date.strftime('%Y-%m-%d'),
                    'price': row.msp,
                    'occupancy_level': self._get_occupancy_level(row.occupancy),
                    'overwrite': False,
                    'occupancy': normalized_occupancy,
                })
            msp_price_history.sort(key=lambda x: x['checkin_date'])
            print(f"[MSPPriceHistoryView] Returning {len(msp_price_history)} MSP price history entries")

            response_data = {
                'property_id': property_id,
                'property_name': property_obj.name,
                'year': year,
                'month': month,
                'price_history': msp_price_history,
                'count': len(msp_price_history)
            }
            print(f"[MSPPriceHistoryView] SUCCESS - Returning response with {len(msp_price_history)} entries")
            logger.info(f"Successfully returned {len(msp_price_history)} MSP price history entries for property {property_id}")
            
            return Response(response_data, status=status.HTTP_200_OK)
        except Property.DoesNotExist:
            print(f"[MSPPriceHistoryView] ERROR - Property {property_id} does not exist in database")
            logger.warning(f"Property {property_id} not found in database")
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"[MSPPriceHistoryView] ERROR - Exception occurred: {str(e)}")
            logger.error(f"Error retrieving MSP price history for property {property_id}: {str(e)}", exc_info=True)
            return Response({
                'message': 'An error occurred while retrieving MSP price history',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @staticmethod
    def _normalize_occupancy(occupancy):
        if occupancy is None:
            return None
        return occupancy * 100 if occupancy <= 1 else occupancy

    def _get_occupancy_level(self, occupancy):
        """
        Return occupancy level as string (low, medium, high) - same logic as PriceHistorySerializer
        """
        occupancy_value = self._normalize_occupancy(occupancy)
        if occupancy_value is None:
            return "medium"
        if occupancy_value <= 35:
            return "low"
        elif occupancy_value <= 69:
            return "medium"
        else:
            return "high"


class CompetitorAveragePriceHistoryView(APIView):
    """
    API endpoint for retrieving Competitor Average price history data for a property
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Retrieve Competitor Average price history data for a specific property
        Returns the competitor_average values from DpPriceChangeHistory for each checkin_date
        """
        year = request.GET.get('year')
        month = request.GET.get('month')
        print(f"[DEBUG] Competitor Average requested for property {property_id}, year {year}, month {month}")
        print(f"[CompetitorAveragePriceHistoryView] GET request - User: {request.user.username}, Property ID: {property_id}")
        logger.info(f"Competitor Average price history requested - User: {request.user.username}, Property ID: {property_id}")
        
        try:
            user_profile = request.user.profile
            print(f"[CompetitorAveragePriceHistoryView] User profile ID: {user_profile.id}")
            
            # Get user's properties for debugging
            user_properties = user_profile.get_properties()
            user_property_ids = list(user_properties.values_list('id', flat=True))
            print(f"[CompetitorAveragePriceHistoryView] User has {user_properties.count()} properties: {user_property_ids}")
            logger.info(f"User {request.user.username} has {user_properties.count()} properties: {user_property_ids}")
            
            if not user_profile.properties.filter(id=property_id).exists():
                print(f"[CompetitorAveragePriceHistoryView] ACCESS DENIED - Property {property_id} not found in user's properties")
                logger.warning(f"User {request.user.username} attempted to access property {property_id} without ownership. User properties: {user_property_ids}")
                return Response({
                    'message': 'Property not found or access denied'
                }, status=status.HTTP_404_NOT_FOUND)

            print(f"[CompetitorAveragePriceHistoryView] ACCESS GRANTED - Property {property_id} found in user's properties")
            logger.info(f"Access granted to property {property_id} for user {request.user.username}")
            
            property_obj = get_object_or_404(Property, id=property_id)
            print(f"[CompetitorAveragePriceHistoryView] Property found: {property_obj.name}")

            year = request.query_params.get('year', timezone.now().year)
            month = request.query_params.get('month', timezone.now().month)
            print(f"[CompetitorAveragePriceHistoryView] Query params - Year: {year}, Month: {month}")
            try:
                year = int(year)
                month = int(month)
                print(f"[CompetitorAveragePriceHistoryView] Parsed params - Year: {year}, Month: {month}")
            except ValueError:
                print(f"[CompetitorAveragePriceHistoryView] Invalid year/month parameters: {year}, {month}")
                return Response({
                    'message': 'Invalid year or month parameter'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calculate date range for the month
            start_date = datetime(year, month, 1).date()
            if month == 12:
                end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
            else:
                end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)

            # Single bulk query for the month, reduce to latest per checkin_date
            qs = (
                DpPriceChangeHistory.objects
                .filter(
                    property_id=property_id,
                    checkin_date__gte=start_date,
                    checkin_date__lte=end_date,
                )
                .order_by('checkin_date', '-as_of')
            )
            latest_by_date = {}
            for row in qs:
                if row.checkin_date not in latest_by_date:
                    latest_by_date[row.checkin_date] = row
            competitor_avg_price_history = []
            for row in latest_by_date.values():
                if row.competitor_average is not None:
                    normalized_occupancy = self._normalize_occupancy(row.occupancy)
                    competitor_avg_price_history.append({
                        'checkin_date': row.checkin_date.strftime('%Y-%m-%d'),
                        'price': row.competitor_average,
                        'occupancy_level': self._get_occupancy_level(row.occupancy),
                        'overwrite': False,
                        'occupancy': normalized_occupancy,
                    })
            competitor_avg_price_history.sort(key=lambda x: x['checkin_date'])
            print(f"[CompetitorAveragePriceHistoryView] Returning {len(competitor_avg_price_history)} competitor average price history entries")

            response_data = {
                'property_id': property_id,
                'property_name': property_obj.name,
                'year': year,
                'month': month,
                'price_history': competitor_avg_price_history,
                'count': len(competitor_avg_price_history)
            }
            print(f"[CompetitorAveragePriceHistoryView] SUCCESS - Returning response with {len(competitor_avg_price_history)} entries")
            logger.info(f"Successfully returned {len(competitor_avg_price_history)} competitor average price history entries for property {property_id}")
            
            return Response(response_data, status=status.HTTP_200_OK)
        except Property.DoesNotExist:
            print(f"[CompetitorAveragePriceHistoryView] ERROR - Property {property_id} does not exist in database")
            logger.warning(f"Property {property_id} not found in database")
            return Response({
                'message': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"[CompetitorAveragePriceHistoryView] ERROR - Exception occurred: {str(e)}")
            logger.error(f"Error retrieving competitor average price history for property {property_id}: {str(e)}", exc_info=True)
            return Response({
                'message': 'An error occurred while retrieving competitor average price history',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @staticmethod
    def _normalize_occupancy(occupancy):
        if occupancy is None:
            return None
        return occupancy * 100 if occupancy <= 1 else occupancy

    def _get_occupancy_level(self, occupancy):
        """
        Return occupancy level as string (low, medium, high) - same logic as PriceHistorySerializer
        """
        occupancy_value = self._normalize_occupancy(occupancy)
        if occupancy_value is None:
            return "medium"
        if occupancy_value <= 35:
            return "low"
        elif occupancy_value <= 69:
            return "medium"
        else:
            return "high"


class OverwritePriceView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, property_id, checkin_date):
        """
        Create or update an overwrite price record for a given property and checkin_date.
        """
        try:
            print(f"[OverwritePriceView] User: {request.user}")
            print(f"[OverwritePriceView] PATCH property_id={property_id}, checkin_date={checkin_date}")
            
            # Validate property
            property_obj = get_object_or_404(Property, id=property_id)
            
            new_price = request.data.get('overwrite_price')
            print(f"[OverwritePriceView] New overwrite_price: {new_price}")
            if new_price is None:
                print(f"[OverwritePriceView] overwrite_price missing in request data: {request.data}")
                return Response({'error': 'overwrite_price is required.'}, status=status.HTTP_400_BAD_REQUEST)

            # Create or update the overwrite price history record
            overwrite_record, created = OverwritePriceHistory.objects.update_or_create(
                property_id=property_id,
                checkin_date=checkin_date,
                defaults={
                    'user': request.user,
                    'overwrite_price': new_price
                }
            )
            
            print(f"[OverwritePriceView] {'Created' if created else 'Updated'} overwrite price record with id: {overwrite_record.id}")

            serializer = OverwritePriceHistorySerializer(overwrite_record)
            return Response({
                'message': f'Overwrite price {created and "set" or "updated"}.', 
                'overwrite_record': serializer.data
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
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

        # Single bulk query for all dates in range (optimized to avoid N+1)
        qs = (
            DpPriceChangeHistory.objects
            .filter(
                property_id=property_id,
                checkin_date__gte=start_date,
                checkin_date__lte=end_date,
            )
            .order_by('checkin_date', '-as_of')
        )
        
        # Get latest record per date
        latest_by_date = {}
        for row in qs:
            if row.checkin_date not in latest_by_date:
                latest_by_date[row.checkin_date] = row
        
        # Prefetch all overwrites in one query to avoid N+1 in serializer
        overwrites = {
            (o.checkin_date, str(o.property_id)): o.overwrite_price
            for o in OverwritePriceHistory.objects.filter(
                property=property_obj,
                checkin_date__gte=start_date,
                checkin_date__lte=end_date
            )
        }
        
        # Serialize with prefetched overwrite data
        price_history = []
        total_price = 0
        valid_days = 0
        
        for checkin_date, record in sorted(latest_by_date.items()):
            serializer = PriceHistorySerializer(record, context={'overwrites': overwrites})
            price_data = serializer.data
            price_history.append(price_data)
            
            # Debug logging for occupancy
            print(f"[price_history_for_date_range] Date: {checkin_date}, Raw occupancy: {record.occupancy}, Serialized occupancy: {price_data.get('occupancy')}, Occupancy level: {price_data.get('occupancy_level')}")
            
            # Add to total for average calculation
            if price_data['price'] is not None:
                total_price += price_data['price']
                valid_days += 1

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
            
            # Generate all dates in range
            dates_to_process = [
                start_date + timedelta(days=i) 
                for i in range((end_date - start_date).days + 1)
            ]
            
            # Fetch existing records in one query (optimized to avoid N+1)
            existing_records = {
                r.checkin_date: r 
                for r in OverwritePriceHistory.objects.filter(
                    property=property_obj,
                    checkin_date__gte=start_date,
                    checkin_date__lte=end_date
                )
            }
            
            # Prepare bulk create/update lists
            to_create = []
            to_update = []
            
            for checkin_date in dates_to_process:
                if checkin_date in existing_records:
                    record = existing_records[checkin_date]
                    record.overwrite_price = overwrite_price
                    record.user = request.user
                    to_update.append(record)
                else:
                    to_create.append(OverwritePriceHistory(
                        property=property_obj,
                        checkin_date=checkin_date,
                        overwrite_price=overwrite_price,
                        user=request.user
                    ))
            
            # Bulk operations
            created_objects = []
            updated_count = 0
            errors = []
            
            try:
                if to_create:
                    created_objects = OverwritePriceHistory.objects.bulk_create(to_create)
                
                if to_update:
                    OverwritePriceHistory.objects.bulk_update(to_update, ['overwrite_price', 'user'])
                    updated_count = len(to_update)
            except Exception as e:
                errors.append(f"Bulk operation error: {str(e)}")
            
            # Serialize results for response
            created_records = []
            updated_records = []
            
            # Serialize created records
            for record in created_objects:
                serializer_data = OverwritePriceHistorySerializer(record).data
                created_records.append(serializer_data)
            
            # Serialize updated records
            for record in to_update:
                serializer_data = OverwritePriceHistorySerializer(record).data
                updated_records.append(serializer_data)
            
            created_count = len(created_objects)
            return Response({
                'message': f'Processed {created_count} new overwrites, {updated_count} updates. {len(errors)} errors.',
                'created': created_records,
                'updated': updated_records,
                'errors': errors,
                'start_date': start_date_str,
                'end_date': end_date_str,
                'overwrite_price': overwrite_price,
            }, status=status.HTTP_201_CREATED if created_count > 0 or updated_count > 0 else status.HTTP_400_BAD_REQUEST)
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

    print(f"[COMPETITOR_PRICES_DEBUG] ===== START get_lowest_competitor_prices_queryset =====")
    print(f"[COMPETITOR_PRICES_DEBUG] base_queryset provided: {base_queryset is not None}")
    
    qs = base_queryset or DpHistoricalCompetitorPrice.objects.all()
    print(f"[COMPETITOR_PRICES_DEBUG] Initial queryset count: {qs.count()}")
    
    # Apply filters
    qs = qs.filter(
        models.Q(max_persons__lt=0) | models.Q(max_persons__gte=2),
        ~models.Q(hotel_name='NOT PARSABLE'),
        models.Q(raw_price__gt=0)  # Exclude records with price 0 or null
    )
    print(f"[COMPETITOR_PRICES_DEBUG] After filtering (max_persons, hotel_name, and raw_price > 0): {qs.count()}")
    
    # Show sample of filtered data
    sample_records = qs[:3]
    for record in sample_records:
        print(f"[COMPETITOR_PRICES_DEBUG] - Sample record: competitor_id={record.competitor_id}, price={record.raw_price}, max_persons={record.max_persons}, hotel_name='{record.hotel_name}'")
    
    qs = qs.annotate(
        rn=Window(
            expression=RowNumber(),
            partition_by=[F('competitor_id'), F('checkin_date')],
            order_by=F('raw_price').asc(nulls_last=True)
        )
    ).filter(rn=1)
    
    print(f"[COMPETITOR_PRICES_DEBUG] After window function and filtering (rn=1): {qs.count()}")
    
    # Show final results
    final_records = list(qs)
    for record in final_records:
        print(f"[COMPETITOR_PRICES_DEBUG] - Final record: competitor_id={record.competitor_id}, price={record.raw_price}, room_name='{record.room_name}'")
    
    print(f"[COMPETITOR_PRICES_DEBUG] ===== END get_lowest_competitor_prices_queryset =====")
    return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lowest_competitor_prices(request):
    """
    Retrieve, for each (competitor, checkin_date), the historical competitor price row with the lowest raw_price.
    Filters out rows where max_persons < 0 or hotel_name == 'NOT PARSABLE'.
    Equivalent to the following SQL:

        SELECT * FROM (
          SELECT *, ROW_NUMBER() OVER(
            PARTITION BY cp.competitor, cp.checkin_date
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
        List of lowest price records per (competitor, checkin_date).
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
    from .models import DpPropertyCompetitor, CompetitorPriceMV, Competitor

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
    # Get competitors for the property (excluding deleted ones)
    competitor_links = DpPropertyCompetitor.objects.filter(
        property_id=property_id,
        deleted_at__isnull=True
    )
    competitors = list(competitor_links.values_list('competitor', flat=True))
    competitors = list(Competitor.objects.filter(id__in=competitors))
    competitor_ids = [comp.id for comp in competitors]

    # Fetch all MV rows for the competitors across the week dates
    mv_rows_qs = (
        CompetitorPriceMV.objects
        .filter(competitor_id__in=competitor_ids, checkin_date__in=week_dates)
        .order_by('competitor_id', 'checkin_date', 'price', 'room_name')
    )

    # Build lookup: competitor_id -> date -> {best_price: number|None, sold_out: bool}
    price_map = {}
    for row in mv_rows_qs.values('competitor_id', 'checkin_date', 'price', 'sold_out_message'):
        competitor_key = row['competitor_id']
        try:
            competitor_key = int(competitor_key)
        except (TypeError, ValueError):
            pass
        checkin_date = row['checkin_date']
        price = row['price']
        sold_out_message = row.get('sold_out_message')

        comp_map = price_map.setdefault(competitor_key, {})
        day_entry = comp_map.setdefault(checkin_date, {'best_price': None, 'sold_out': False})

        # Determine if this row indicates sold out
        price_is_zero = False
        try:
            price_is_zero = (price is not None and float(price) == 0.0)
        except Exception:
            price_is_zero = False

        if price_is_zero and sold_out_message:
            day_entry['sold_out'] = True
            # Do not set numeric price when sold out; continue
            continue

        # Track minimum non-zero positive price
        try:
            if price is not None and float(price) > 0.0:
                if day_entry['best_price'] is None or float(price) < float(day_entry['best_price']):
                    day_entry['best_price'] = price
        except Exception:
            # Ignore rows with non-numeric price
            pass

    # Build response with the same shape used by the frontend, plus sold_out flags per day
    competitors_data = []
    for comp in competitors:
        comp_map = price_map.get(comp.id, {})
        prices_for_week = []
        sold_out_for_week = []
        for d in week_dates:
            entry = comp_map.get(d)
            if not entry:
                prices_for_week.append(None)
                sold_out_for_week.append(False)
                continue
            if entry['best_price'] is not None:
                prices_for_week.append(entry['best_price'])
                sold_out_for_week.append(False)
            elif entry['sold_out']:
                # Represent sold-out as null (no numeric price)
                prices_for_week.append(None)
                sold_out_for_week.append(True)
            else:
                prices_for_week.append(None)
                sold_out_for_week.append(False)

        competitors_data.append({
            'id': comp.id,
            'name': comp.competitor_name,
            'prices': prices_for_week,
            'sold_out': sold_out_for_week,
        })

    return Response({
        'dates': [d.isoformat() for d in week_dates],
        'competitors': competitors_data,
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
    from .models import DpPropertyCompetitor, DpHistoricalCompetitorPrice, CompetitorPriceMV, Competitor

    # Minimal request context
    
    # Parse date
    date_str = request.query_params.get('date')
    if not date_str:
        return Response({'error': 'date query parameter is required (YYYY-MM-DD)'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format, expected YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get competitors for the property (excluding deleted ones)
    competitor_links = DpPropertyCompetitor.objects.filter(
        property_id=property_id,
        deleted_at__isnull=True
    )
    if competitor_links.count() == 0:
        return Response([], status=status.HTTP_200_OK)
    
    competitors = list(competitor_links.values_list('competitor', flat=True))
    competitors = list(Competitor.objects.filter(id__in=competitors))
    # (removed verbose diagnostics against MV)
    
    # Fetch prices from materialized view using Django ORM (no raw SQL)
    # Convert competitor names to slug format for matching with MV
    mv_competitor_ids = [comp.id for comp in competitors]
    
    mv_rows_qs = (
        CompetitorPriceMV.objects
        .filter(competitor_id__in=mv_competitor_ids, checkin_date=date_obj)
        .order_by('competitor_id', 'price', 'room_name')
    )
    mv_rows = list(mv_rows_qs.values('competitor_id', 'hotel_name', 'room_name', 'price', 'raw_price', 'currency', 'sold_out_message', 'update_tz'))
    # (removed verbose MV logging)
    
    results = mv_rows
    
    # Build a lookup by competitor_id (scraped_hotel_id)
    price_lookup = {}
    for row in results:
        comp_key = row['competitor_id']
        try:
            comp_key = int(comp_key)
        except (TypeError, ValueError):
            pass
        price_lookup[comp_key] = row
    
    # Build response - match competitors with their prices
    competitors_data = []
    for comp in competitors:
        # Try to find a matching row by competitor name (converted to slug format)
        row = price_lookup.get(comp.id)
        
        if row:
            # Determine sold-out state: price equals 0 and sold_out_message present
            sold_out = False
            try:
                price_val = row['price']
                price_is_zero = price_val is not None and float(price_val) == 0.0
            except Exception:
                price_is_zero = False
            sold_out = bool(price_is_zero and row.get('sold_out_message'))

            # If price is zero and not sold out, hide this competitor (skip)
            if price_is_zero and not sold_out:
                continue

            competitor_data = {
                'id': comp.id,
                'name': comp.competitor_name,
                # If sold out, hide numeric price and signal sold_out to client
                'price': None if sold_out else row['price'],
                'currency': row.get('currency'),
                'room_name': row.get('room_name'),
                'sold_out': sold_out,
                'sold_out_message': row.get('sold_out_message') if sold_out else None,
            }
            competitors_data.append(competitor_data)
        else:
            pass

    # Minimal summary log
    print(f"[COMPETITOR_PRICES] {len(competitors_data)} competitors returned for {date_obj}")
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
        log_operation(
            logger, LogLevel.INFO,
            "Starting competitor fetch request processing",
            "competitor_fetch_start",
            request, getattr(request, 'user', None),
            request_data=request.data
        )
        
        try:
            # Get the booking URL from the request
            booking_url = request.data.get('booking_url')
            
            log_operation(
                logger, LogLevel.DEBUG,
                f"Booking URL extracted: {booking_url}",
                "booking_url_extracted",
                request, getattr(request, 'user', None),
                booking_url=booking_url
            )
            
            if not booking_url:
                log_operation(
                    logger, LogLevel.WARNING,
                    "No booking_url provided in request",
                    "missing_booking_url",
                    request, getattr(request, 'user', None)
                )
                return Response({
                    'error': 'booking_url is required in request body'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get API configuration from settings and environment
            api_base_url = settings.COMPETITOR_API_BASE_URL
            api_token = config('HOTEL_COMPETITOR_SERVICE_TOKEN', default='')
            
            log_operation(
                logger, LogLevel.DEBUG,
                f"API configuration loaded",
                "api_config_loaded",
                request, getattr(request, 'user', None),
                api_base_url=api_base_url,
                has_token=bool(api_token)
            )
            
            if not api_token:
                log_operation(
                    logger, LogLevel.ERROR,
                    "No API token configured for competitor service",
                    "missing_api_token",
                    request, getattr(request, 'user', None)
                )
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

            log_api_call(
                logger, LogLevel.INFO,
                f"Calling external competitor API",
                "competitor_api",
                api_url,
                "POST",
                request=request,
                user=getattr(request, 'user', None),
                payload=payload
            )

            # Make the request to the external API
            start_time = time.time()
            response = requests.post(api_url, headers=headers, json=payload, timeout=30)
            response_time = time.time() - start_time
            
            log_api_call(
                logger, LogLevel.INFO,
                f"External API response received",
                "competitor_api",
                api_url,
                "POST",
                response.status_code,
                response_time,
                request=request,
                user=getattr(request, 'user', None),
                response_size=len(response.content) if hasattr(response, 'content') else 0
            )
            
            if response.status_code == 401:
                log_api_call(
                    logger, LogLevel.ERROR,
                    f"Authentication failed with external competitor API",
                    "competitor_api",
                    api_url,
                    "POST",
                    response.status_code,
                    response_time,
                    request=request,
                    user=getattr(request, 'user', None)
                )
                return Response({
                    'error': 'Authentication failed with competitor API'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if response.status_code == 404:
                log_api_call(
                    logger, LogLevel.WARNING,
                    f"No competitors found for URL",
                    "competitor_api",
                    api_url,
                    "POST",
                    response.status_code,
                    response_time,
                    request=request,
                    user=getattr(request, 'user', None),
                    booking_url=booking_url
                )
                return Response({
                    'error': 'No competitors found for the provided Booking.com URL'
                }, status=status.HTTP_404_NOT_FOUND)
            
            try:
                response.raise_for_status()
                log_operation(
                    logger, LogLevel.DEBUG,
                    f"Response status is OK, proceeding to parse JSON",
                    "api_response_ok",
                    request, getattr(request, 'user', None),
                    status_code=response.status_code
                )
            except requests.exceptions.HTTPError as e:
                log_api_call(
                    logger, LogLevel.ERROR,
                    f"HTTP Error from external API: {e}",
                    "competitor_api",
                    api_url,
                    "POST",
                    response.status_code,
                    response_time,
                    request=request,
                    user=getattr(request, 'user', None),
                    error=str(e),
                    response_content=response.text[:500]  # Truncate for logging
                )
                raise
            
            # Parse the response
            try:
                api_response = response.json()
                log_operation(
                    logger, LogLevel.DEBUG,
                    f"Successfully parsed JSON response",
                    "json_parsed",
                    request, getattr(request, 'user', None),
                    response_keys=list(api_response.keys()) if isinstance(api_response, dict) else 'Not a dict'
                )
                
                logger.info(f"External API response: {api_response}")
            except Exception as e:
                log_operation(
                    logger, LogLevel.ERROR,
                    f"Error parsing JSON response: {e}",
                    "json_parse_error",
                    request, getattr(request, 'user', None),
                    error=str(e),
                    raw_response=response.text[:500]  # Truncate for logging
                )
                raise
            
            # Extract the competitors from the response
            competitors = api_response.get('competitors', [])
            target_hotel = api_response.get('target_hotel', {})
            
            log_operation(
                logger, LogLevel.INFO,
                f"Found {len(competitors)} competitors in response",
                "competitors_found",
                request, getattr(request, 'user', None),
                competitor_count=len(competitors),
                target_hotel_name=target_hotel.get('name', 'Unknown')
            )
            
            # Process and return the competitors
            processed_competitors = []
            for i, comp in enumerate(competitors):
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
                
                log_operation(
                    logger, LogLevel.DEBUG,
                    f"Processed competitor: {processed_competitor['name']}",
                    "competitor_processed",
                    request, getattr(request, 'user', None),
                    competitor_name=processed_competitor['name'],
                    competitor_index=i+1
                )

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
            
            log_operation(
                logger, LogLevel.INFO,
                f"Successfully returning response with {len(processed_competitors)} competitors",
                "competitor_fetch_success",
                request, getattr(request, 'user', None),
                competitor_count=len(processed_competitors),
                target_hotel_name=target_hotel.get('name', 'Unknown')
            )
            
            return Response(final_response, status=status.HTTP_200_OK)
            
        except requests.exceptions.Timeout:
            log_operation(
                logger, LogLevel.ERROR,
                f"Request timeout while calling external competitor API",
                "competitor_api_timeout",
                request, getattr(request, 'user', None),
                booking_url=booking_url
            )
            return Response({
                'error': 'Request to competitor API timed out'
            }, status=status.HTTP_504_GATEWAY_TIMEOUT)
            
        except requests.exceptions.RequestException as e:
            log_operation(
                logger, LogLevel.ERROR,
                f"Request exception while calling external competitor API: {e}",
                "competitor_api_request_error",
                request, getattr(request, 'user', None),
                error=str(e),
                booking_url=booking_url
            )
            return Response({
                'error': f'Failed to call competitor API: {str(e)}'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        except Exception as e:
            log_operation(
                logger, LogLevel.ERROR,
                f"Unexpected exception in FetchCompetitorsView: {e}",
                "competitor_fetch_unexpected_error",
                request, getattr(request, 'user', None),
                error=str(e),
                error_type=type(e).__name__,
                booking_url=booking_url
            )
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
            print(f"🔍 BulkCompetitorCandidateCreateView: Received property_id: {property_id}")
            print(f"🔍 BulkCompetitorCandidateCreateView: Request data: {request.data}")
            print(f"🔍 BulkCompetitorCandidateCreateView: User: {request.user.username}")
            
            # Check user's profile
            try:
                user_profile = request.user.profile
                print(f"🔍 BulkCompetitorCandidateCreateView: User profile ID: {user_profile.id}")
                print(f"🔍 BulkCompetitorCandidateCreateView: User profile properties count: {user_profile.get_properties().count()}")
                
                # Check if the specific property is associated with this user
                if property_id:
                    from dynamic_pricing.models import Property
                    try:
                        property_obj = Property.objects.get(id=property_id)
                        print(f"🔍 BulkCompetitorCandidateCreateView: Property found: {property_obj.name}")
                        print(f"🔍 BulkCompetitorCandidateCreateView: Property profiles: {list(property_obj.profiles.values_list('id', flat=True))}")
                        print(f"🔍 BulkCompetitorCandidateCreateView: User has this property: {user_profile.has_property(property_obj)}")
                    except Property.DoesNotExist:
                        print(f"🔍 BulkCompetitorCandidateCreateView: Property {property_id} does not exist")
            except Exception as e:
                print(f"🔍 BulkCompetitorCandidateCreateView: Error getting user profile: {e}")
            
            # CRITICAL: property_id is REQUIRED - either from URL or request body
            context = {'request': request}
            
            # Get property_id from URL parameter or request body
            property_id = property_id or request.data.get('property_id')
            
            if not property_id:
                return Response({
                    'message': 'property_id is required. Provide it in the URL path or request body.',
                    'error': 'PROPERTY_ID_REQUIRED'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            context['property_id'] = property_id
            print(f"🔍 BulkCompetitorCandidateCreateView: Using property_id: {property_id}")
                
            serializer = BulkCompetitorCandidateSerializer(data=request.data, context=context)
            
            print(f"🔍 BulkCompetitorCandidateCreateView: Serializer validation starting...")
            if serializer.is_valid():
                print(f"🔍 BulkCompetitorCandidateCreateView: Serializer is valid, proceeding to save...")
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
                print(f"🔍 BulkCompetitorCandidateCreateView: Serializer validation failed with errors: {serializer.errors}")
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
                    pricing_status='online',
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
                    pricing_status='online',
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
            
            # Update pricing_status if provided
            if 'pricing_status' in request.data:
                new_pricing_status = request.data.get('pricing_status')
                print(f"🔧 DEBUG: Updating pricing_status to: {new_pricing_status}")
                allowed_values = ['offline', 'online']
                if new_pricing_status not in allowed_values:
                    print(f"🔧 DEBUG: Invalid pricing_status value: {new_pricing_status}")
                    return Response({
                        'message': f'pricing_status must be one of: {", ".join(allowed_values)}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                old_pricing_status = settings.pricing_status
                print(f"🔧 DEBUG: Changing pricing_status from '{old_pricing_status}' to '{new_pricing_status}'")
                settings.pricing_status = new_pricing_status
                updated_fields.append(f'pricing_status: {old_pricing_status} -> {new_pricing_status}')
            
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
                    'pricing_status': settings.pricing_status,
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
            ).select_related('competitor').order_by('created_at')

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
            competitor = property_competitor.competitor
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
            
            print(f"Updated property competitor {competitor} for property {property_id}")
            
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
            print(f"📊 Competitor name: {property_competitor.competitor.competitor_name}")
            print(f"📊 Current deleted_at: {property_competitor.deleted_at}")
            
            # Soft delete the competitor by setting deleted_at timestamp
            from django.utils import timezone
            property_competitor.deleted_at = timezone.now()
            property_competitor.save()
            
            print(f"💾 Property competitor soft deleted successfully")
            
            return Response({
                'message': 'Property competitor deleted successfully',
                'competitor_id': competitor_id,
                'competitor_name': property_competitor.competitor.competitor_name
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
                # CRITICAL: Pass property_id from URL to serializer context
                serializer = BulkOfferIncrementsSerializer(
                    data=request.data, 
                    context={'request': request, 'property_id': property_id}
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
        # CRITICAL DEBUG: Log property_id from URL
        print(f"🔧 BACKEND DEBUG: DynamicIncrementsV2CreateView.post() called")
        print(f"🔧 BACKEND DEBUG: property_id from URL: {property_id}")
        print(f"🔧 BACKEND DEBUG: user: {request.user.username} (id: {request.user.id})")
        print(f"🔧 BACKEND DEBUG: request.data: {request.data}")
        
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            print(f"🔧 BACKEND DEBUG: Property found: {property_instance.id} ({property_instance.name})")
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                print(f"🔧 BACKEND DEBUG: User does not have access to property {property_id}")
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            print(f"🔧 BACKEND DEBUG: User has access to property {property_id}")
            
            # Check if this is a bulk create request
            if 'rules' in request.data:
                print(f"🔧 BACKEND DEBUG: Bulk create request detected. Number of rules: {len(request.data.get('rules', []))}")
                # Bulk create multiple rules
                # CRITICAL: Pass property_id from URL to serializer context
                serializer = BulkDynamicIncrementsV2Serializer(
                    data=request.data, 
                    context={'request': request, 'property_id': property_id}
                )
                
                if serializer.is_valid():
                    try:
                        result = serializer.save()
                    except ValidationError as e:
                        # Convert serializer/DB validation errors into a proper 400
                        logger.warning(f"Validation error while creating dynamic increments (bulk): {str(e)}")
                        error_detail = getattr(e, 'detail', None)
                        return Response({
                            'message': 'Validation error while creating dynamic increments',
                            'error': error_detail if error_detail is not None else str(e),
                            'errors': error_detail if isinstance(error_detail, dict) else None,
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
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
        except ValidationError as e:
            # Catch any uncaught ValidationError and convert to 400 instead of generic 500
            logger.warning(f"Validation error while creating dynamic increment: {str(e)}")
            error_detail = getattr(e, 'detail', None)
            return Response({
                'message': 'Validation error while creating the dynamic increment',
                'error': error_detail if error_detail is not None else str(e),
                'errors': error_detail if isinstance(error_detail, dict) else None,
            }, status=status.HTTP_400_BAD_REQUEST)
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


class DynamicIncrementsV2BulkUpdateView(APIView):
    """
    API endpoint for bulk updating dynamic increments v2 (dynamic setup)
    """
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, property_id):
        """
        Bulk update multiple dynamic increments for a specific property
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
            serializer = BulkUpdateDynamicIncrementsV2Serializer(
                data=request.data, 
                context={'request': request}
            )
            
            if serializer.is_valid():
                result = serializer.update(property_instance, serializer.validated_data)
                
                # Serialize the updated rules for response
                updated_rules_data = DynamicIncrementsV2Serializer(
                    result['updated_rules'], 
                    many=True
                ).data
                
                return Response({
                    'message': f"Successfully updated {len(result['updated_rules'])} dynamic increments",
                    'updated_rules': updated_rules_data,
                    'errors': result.get('errors', []),
                    'property_id': result['property_id']
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
        except Exception as e:
            logger.error(f"Error bulk updating dynamic increments: {str(e)}")
            return Response({
                'message': 'An error occurred while bulk updating the dynamic increments',
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
            
            # Prepare serializer with context so it assigns property and user server-side
            serializer = DpLosReductionSerializer(
                data=request.data,
                context={'request': request, 'property': property_instance, 'user': request.user}
            )
            
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
        print(f"🔧 DEBUG: LosSetupListView GET called for property_id: {property_id}")
        print(f"🔧 DEBUG: User: {request.user.username}")
        
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            print(f"🔧 DEBUG: Property found: {property_instance.name}")
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                print(f"🔧 DEBUG: User {request.user.username} does not have access to property {property_id}")
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get all LOS setup rules for this property
            los_setups = DpLosSetup.objects.filter(
                property_id=property_instance
            ).order_by('-created_at')
            
            print(f"🔧 DEBUG: Found {los_setups.count()} LOS setup rules")
            
            serializer = DpLosSetupSerializer(los_setups, many=True)
            
            print(f"🔧 DEBUG: Serialized data: {serializer.data}")
            
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
        print(f"🔧 DEBUG: LosSetupCreateView POST called for property_id: {property_id}")
        print(f"🔧 DEBUG: User: {request.user.username}")
        print(f"🔧 DEBUG: Request data: {request.data}")
        
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            print(f"🔧 DEBUG: Property found: {property_instance.name}")
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                print(f"🔧 DEBUG: User {request.user.username} does not have access to property {property_id}")
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Prepare serializer with context so it assigns property and user server-side
            serializer = DpLosSetupSerializer(data=request.data, context={'request': request, 'property': property_instance, 'user': request.user})
            
            print(f"🔧 DEBUG: Serializer validation: {serializer.is_valid()}")
            if not serializer.is_valid():
                print(f"🔧 DEBUG: Serializer errors: {serializer.errors}")
            
            if serializer.is_valid():
                los_setup = serializer.save()
                print(f"🔧 DEBUG: Created LOS setup rule: {los_setup.id}")
                print(f"🔧 DEBUG: Created rule data: day_of_week={los_setup.day_of_week}, valid_from={los_setup.valid_from}, valid_until={los_setup.valid_until}, los_value={los_setup.los_value}")
                
                response_data = {
                    'message': 'LOS setup rule created successfully',
                    'setup': DpLosSetupSerializer(los_setup).data
                }
                print(f"🔧 DEBUG: Response data: {response_data}")
                
                return Response(response_data, status=status.HTTP_201_CREATED)
            else:
                print(f"🔧 DEBUG: Validation failed with errors: {serializer.errors}")
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
        print(f"🔧 DEBUG: LosSetupUpdateView PATCH called for property_id: {property_id}, setup_id: {setup_id}")
        print(f"🔧 DEBUG: User: {request.user.username}")
        print(f"🔧 DEBUG: Request data: {request.data}")
        
        try:
            # Get the property and ensure it exists
            property_instance = get_object_or_404(Property, id=property_id)
            print(f"🔧 DEBUG: Property found: {property_instance.name}")
            
            # Check if user has access to this property
            user_profile = request.user.profile
            user_properties = user_profile.get_properties()
            
            if not user_properties.filter(id=property_id).exists():
                print(f"🔧 DEBUG: User {request.user.username} does not have access to property {property_id}")
                return Response({
                    'message': 'You do not have access to this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get the LOS setup rule
            los_setup = get_object_or_404(
                DpLosSetup, 
                id=setup_id, 
                property_id=property_instance
            )
            
            print(f"🔧 DEBUG: Found existing LOS setup rule: {los_setup.id}")
            print(f"🔧 DEBUG: Current rule data: day_of_week={los_setup.day_of_week}, valid_from={los_setup.valid_from}, valid_until={los_setup.valid_until}, los_value={los_setup.los_value}")
            
            serializer = DpLosSetupSerializer(
                los_setup, 
                data=request.data, 
                partial=True
            )
            
            print(f"🔧 DEBUG: Serializer validation: {serializer.is_valid()}")
            if not serializer.is_valid():
                print(f"🔧 DEBUG: Serializer errors: {serializer.errors}")
            
            if serializer.is_valid():
                updated_setup = serializer.save()
                print(f"🔧 DEBUG: Updated rule data: day_of_week={updated_setup.day_of_week}, valid_from={updated_setup.valid_from}, valid_until={updated_setup.valid_until}, los_value={updated_setup.los_value}")
                
                response_data = {
                    'message': 'LOS setup rule updated successfully',
                    'setup': DpLosSetupSerializer(updated_setup).data
                }
                print(f"🔧 DEBUG: Response data: {response_data}")
                
                return Response(response_data, status=status.HTTP_200_OK)
            else:
                print(f"🔧 DEBUG: Validation failed with errors: {serializer.errors}")
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

            # Build a pre-fetched map of DpRoomRates by rate_id to avoid N+1
            rate_ids = list(available_rates.values_list('rate_id', flat=True))
            config_qs = DpRoomRates.objects.filter(
                property_id=property_instance,
                rate_id__in=rate_ids
            ).values('rate_id', 'increment_type', 'increment_value', 'is_base_rate')
            rate_config_by_rate_id = {c['rate_id']: c for c in config_qs}

            # Serialize the data using the unified serializer with context map
            serializer = AvailableRatesUnifiedSerializer(
                available_rates,
                many=True,
                context={'rate_config_by_rate_id': rate_config_by_rate_id}
            )
            
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
            from django.db import transaction
            from django.utils import timezone
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

            with transaction.atomic():
                # If any item is set as base rate, unset all others ONCE
                if any(r.get('is_base_rate') for r in rates_data):
                    DpRoomRates.objects.filter(
                        property_id=property_instance
                    ).update(is_base_rate=False)

                rate_ids = [r['rate_id'] for r in rates_data]
                existing_qs = DpRoomRates.objects.filter(
                    property_id=property_instance,
                    rate_id__in=rate_ids
                )
                existing_by_rate_id = {rr.rate_id: rr for rr in existing_qs}

                to_create = []
                to_update = []

                now = timezone.now()

                for rate_data in rates_data:
                    try:
                        rate_id = rate_data['rate_id']
                        increment_type = rate_data['increment_type']
                        increment_value = rate_data['increment_value']
                        is_base_rate = rate_data['is_base_rate']

                        if rate_id in existing_by_rate_id:
                            room_rate = existing_by_rate_id[rate_id]
                            room_rate.increment_type = increment_type
                            room_rate.increment_value = increment_value
                            room_rate.is_base_rate = is_base_rate
                            room_rate.updated_at = now
                            to_update.append(room_rate)
                        else:
                            room_rate = DpRoomRates(
                                property_id=property_instance,
                                user=request.user,
                                rate_id=rate_id,
                                increment_type=increment_type,
                                increment_value=increment_value,
                                is_base_rate=is_base_rate,
                                created_at=now,
                                updated_at=now,
                            )
                            to_create.append(room_rate)
                    except Exception as e:
                        errors.append({
                            'rate_id': rate_data.get('rate_id', 'unknown'),
                            'error': str(e)
                        })

                if to_create:
                    DpRoomRates.objects.bulk_create(to_create, ignore_conflicts=True)
                    created_rates.extend(to_create)
                if to_update:
                    DpRoomRates.objects.bulk_update(
                        to_update,
                        ['increment_type', 'increment_value', 'is_base_rate', 'updated_at']
                    )
                    updated_rates.extend(to_update)

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


class CheckMSPStatusView(APIView):
    """
    Check MSP configuration status and trigger notifications if needed
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id=None):
        """
        Check MSP status for a specific property or all user properties
        
        GET /dynamic-pricing/properties/{property_id}/check-msp/  - Check specific property
        GET /dynamic-pricing/check-msp/  - Check all user properties
        """
        from .notification_triggers import (
            check_and_notify_msp_status,
            check_and_notify_msp_for_all_user_properties,
            check_msp_for_upcoming_period
        )
        
        try:
            if property_id:
                # Check specific property
                property_instance = get_object_or_404(Property, id=property_id)
                
                # Verify user has access
                user_profile = request.user.profile
                if not user_profile.properties.filter(id=property_id).exists():
                    return Response({
                        'message': 'You do not have access to this property'
                    }, status=status.HTTP_403_FORBIDDEN)
                
                # Check and create notifications if needed
                notification_result = check_and_notify_msp_status(request.user, property_instance)
                
                # Get 30-day coverage statistics
                coverage_stats = check_msp_for_upcoming_period(property_instance, days_ahead=30)
                
                return Response({
                    'property_id': property_id,
                    'property_name': property_instance.name,
                    'notifications_created': notification_result['notifications_created'],
                    'coverage_stats': coverage_stats
                }, status=status.HTTP_200_OK)
            else:
                # Check all user properties
                result = check_and_notify_msp_for_all_user_properties(request.user)
                
                return Response({
                    'message': 'MSP check completed for all properties',
                    'result': result
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error checking MSP status: {str(e)}", exc_info=True)
            return Response({
                'error': 'An error occurred while checking MSP status',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InitializePropertyDefaultsView(APIView):
    """
    Initialize default dynamic pricing configuration for a property.
    This endpoint is called when a user completes onboarding to set up:
    - DpGeneralSettings with default values
    - DpDynamicIncrementsV2 with all 56 default pricing increments
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, property_id):
        """
        POST /dynamic-pricing/properties/{property_id}/initialize-defaults/
        
        Creates default configuration for a property if it doesn't already exist.
        """
        from .default_values import DEFAULT_DYNAMIC_INCREMENTS, DEFAULT_GENERAL_SETTINGS
        
        try:
            # Debug prints to trace request lifecycle
            print(f"[InitializePropertyDefaultsView] INIT user_id={getattr(request.user, 'id', None)} property_id={property_id}")
            # Get the property
            property_instance = get_object_or_404(Property, id=property_id)
            logger.info(f"Initializing defaults for property: {property_id}")
            print(f"[InitializePropertyDefaultsView] Property resolved id={property_instance.id} name={getattr(property_instance, 'name', None)}")
            
            # Check if user has access to this property
            if not property_instance.profiles.filter(user=request.user).exists():
                logger.warning(f"User {request.user.id} does not have access to property {property_id}")
                print(f"[InitializePropertyDefaultsView] PERMISSION DENIED user_id={request.user.id} property_id={property_id}")
                return Response({
                    'error': 'You do not have permission to access this property'
                }, status=status.HTTP_403_FORBIDDEN)
            
            created_count = 0
            skipped_count = 0
            errors = []
            
            # 1. Create or update DpGeneralSettings
            general_settings, settings_created = DpGeneralSettings.objects.get_or_create(
                property_id=property_instance,
                defaults={
                    'user': request.user,
                    **DEFAULT_GENERAL_SETTINGS
                }
            )
            
            if settings_created:
                logger.info(f"Created DpGeneralSettings for property {property_id}")
                print(f"[InitializePropertyDefaultsView] Created DpGeneralSettings property_id={property_id}")
                created_count += 1
            else:
                logger.info(f"DpGeneralSettings already exists for property {property_id}")
                print(f"[InitializePropertyDefaultsView] DpGeneralSettings already exists property_id={property_id}")
                skipped_count += 1
            
            # 2. Create DpDynamicIncrementsV2 entries (56 total)
            increments_created = 0
            increments_skipped = 0
            
            for increment_data in DEFAULT_DYNAMIC_INCREMENTS:
                try:
                    # Check if this combination already exists
                    exists = DpDynamicIncrementsV2.objects.filter(
                        property_id=property_instance,
                        occupancy_category=increment_data['occupancy_category'],
                        lead_time_category=increment_data['lead_time_category']
                    ).exists()
                    
                    if not exists:
                        DpDynamicIncrementsV2.objects.create(
                            property_id=property_instance,
                            user=request.user,
                            occupancy_category=increment_data['occupancy_category'],
                            lead_time_category=increment_data['lead_time_category'],
                            increment_type=increment_data['increment_type'],
                            increment_value=increment_data['increment_value']
                        )
                        increments_created += 1
                    else:
                        increments_skipped += 1
                        
                except Exception as e:
                    error_msg = f"Error creating increment for {increment_data['occupancy_category']}/{increment_data['lead_time_category']}: {str(e)}"
                    logger.error(error_msg)
                    print(f"[InitializePropertyDefaultsView] {error_msg}")
                    errors.append(error_msg)
            
            logger.info(f"Created {increments_created} dynamic increments, skipped {increments_skipped} existing ones")
            print(f"[InitializePropertyDefaultsView] Summary increments_created={increments_created} increments_skipped={increments_skipped} settings_created={settings_created}")
            
            # Calculate totals
            total_created = created_count + increments_created
            total_skipped = skipped_count + increments_skipped
            
            response_payload = {
                'message': 'Property defaults initialized successfully',
                'property_id': property_id,
                'summary': {
                    'general_settings_created': settings_created,
                    'dynamic_increments_created': increments_created,
                    'dynamic_increments_skipped': increments_skipped,
                    'total_created': total_created,
                    'total_skipped': total_skipped
                },
                'errors': errors if errors else None
            }
            resp_status = status.HTTP_201_CREATED if total_created > 0 else status.HTTP_200_OK
            print(f"[InitializePropertyDefaultsView] RESP status={resp_status} property_id={property_id}")
            return Response(response_payload, status=resp_status)
            
        except Property.DoesNotExist:
            logger.error(f"Property {property_id} not found")
            print(f"[InitializePropertyDefaultsView] Property not found property_id={property_id}")
            return Response({
                'error': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error initializing defaults for property {property_id}: {str(e)}", exc_info=True)
            print(f"[InitializePropertyDefaultsView] ERROR property_id={property_id} error={str(e)}")
            return Response({
                'error': 'An error occurred while initializing property defaults',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Competitor views moved from booking app
class BulkCompetitorCreateView(APIView):
    """
    API endpoint for creating multiple competitors at once
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Create multiple competitors for a property with booking URLs
        """
        # CRITICAL: Pass property_id from request data to serializer context if provided
        property_id = request.data.get('property_id')
        print(f"🔧 BACKEND DEBUG: BulkCompetitorCreateView.post() called")
        print(f"🔧 BACKEND DEBUG: property_id from request data: {property_id}")
        print(f"🔧 BACKEND DEBUG: user: {request.user.username} (id: {request.user.id})")
        
        try:
            serializer = BulkCompetitorCreateSerializer(
                data=request.data, 
                context={'request': request, 'property_id': property_id}
            )
            
            if serializer.is_valid():
                # Create the competitors
                result = serializer.save()
                
                # Prepare response data
                created_competitors = result['created_competitors']
                errors = result['errors']
                property_id = result['property_id']
                
                # Serialize the created competitors
                competitor_serializer = CompetitorDetailSerializer(created_competitors, many=True)
                
                response_data = {
                    'message': f'Successfully created {len(created_competitors)} competitors',
                    'property_id': property_id,
                    'created_competitors': competitor_serializer.data,
                    'total_created': len(created_competitors),
                    'total_errors': len(errors)
                }
                
                if errors:
                    response_data['errors'] = errors
                    response_data['message'] += f' with {len(errors)} errors'
                
                logger.info(f"Bulk competitor creation completed: {len(created_competitors)} created, {len(errors)} errors")
                
                return Response(response_data, status=status.HTTP_201_CREATED)
            else:
                logger.warning(f"Bulk competitor creation failed - validation errors: {serializer.errors}")
                return Response({
                    'message': 'Bulk competitor creation failed',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error in bulk competitor creation: {str(e)}")
            return Response({
                'message': 'An error occurred while creating the competitors',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompetitorCreateView(APIView):
    """
    API endpoint for creating a new Competitor for a Property
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Create a new competitor for a property with minimal data (booking URL)
        """
        try:
            serializer = CompetitorCreateSerializer(data=request.data)
            
            if serializer.is_valid():
                # Create the competitor
                competitor = serializer.save()
                
                # Get the property ID from the validated data
                property_id = request.data.get('property_id')
                if property_id:
                    # Create the property-competitor relationship
                    try:
                        property_instance = Property.objects.get(id=property_id)
                        dp_property_competitor, created = DpPropertyCompetitor.objects.get_or_create(
                            property_id=property_instance,
                            competitor=competitor,
                            user=request.user
                        )
                        
                        if created:
                            logger.info(f"Created property-competitor relationship: {property_id} - {competitor.competitor}")
                        else:
                            logger.info(f"Property-competitor relationship already exists: {property_id} - {competitor.competitor}")
                            
                    except Property.DoesNotExist:
                        logger.error(f"Property {property_id} not found when creating competitor relationship")
                        # Continue anyway since the competitor was created successfully
                
                # Return the created competitor with full details
                detail_serializer = CompetitorDetailSerializer(competitor)
                
                logger.info(f"Competitor created successfully: {competitor.competitor} - {competitor.competitor_name}")
                
                return Response({
                    'message': 'Competitor created successfully',
                    'competitor': detail_serializer.data,
                    'property_id': property_id
                }, status=status.HTTP_201_CREATED)
            else:
                logger.warning(f"Competitor creation failed - validation errors: {serializer.errors}")
                return Response({
                    'message': 'Competitor creation failed',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error creating competitor: {str(e)}")
            return Response({
                'message': 'An error occurred while creating the competitor',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompetitorDetailView(APIView):
    """
    API endpoint for retrieving, updating, and deleting a specific Competitor
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, competitor_id):
        """
        Retrieve a specific competitor by ID
        """
        try:
            competitor = get_object_or_404(Competitor, id=competitor_id)
            serializer = CompetitorDetailSerializer(competitor)
            
            return Response({
                'competitor': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving competitor {competitor}: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving the competitor',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request, competitor_id):
        """
        Update a specific competitor by ID
        """
        try:
            competitor = get_object_or_404(Competitor, id=competitor_id)
            serializer = CompetitorDetailSerializer(competitor, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                
                logger.info(f"Competitor updated successfully: {competitor}")
                
                return Response({
                    'message': 'Competitor updated successfully',
                    'competitor': serializer.data
                }, status=status.HTTP_200_OK)
            else:
                logger.warning(f"Competitor update failed - validation errors: {serializer.errors}")
                return Response({
                    'message': 'Competitor update failed',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error updating competitor {competitor}: {str(e)}")
            return Response({
                'message': 'An error occurred while updating the competitor',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, competitor_id):
        """
        Delete a specific competitor by ID
        """
        try:
            competitor = get_object_or_404(Competitor, id=competitor_id)
            competitor.delete()
            
            logger.info(f"Competitor deleted successfully: {competitor_id}")
            
            return Response({
                'message': 'Competitor deleted successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error deleting competitor {competitor}: {str(e)}")
            return Response({
                'message': 'An error occurred while deleting the competitor',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompetitorListView(APIView):
    """
    API endpoint for listing all competitors
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Retrieve a list of all competitors
        """
        try:
            # Get query parameters for filtering
            property_id = request.query_params.get('property_id')
            
            # Build queryset
            queryset = Competitor.objects.all()
            
            if property_id:
                # Filter competitors that are associated with the specific property
                queryset = queryset.filter(
                    dp_property_competitor__property_id=property_id
                )
            
            # Order by competitor name
            queryset = queryset.order_by('competitor_name')
            
            serializer = CompetitorListSerializer(queryset, many=True)
            
            return Response({
                'competitors': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving competitors list: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving the competitors list',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PropertyCompetitorsView(APIView):
    """
    API endpoint for managing competitors for a specific property
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, property_id):
        """
        Get all competitors for a specific property
        """
        try:
            property_instance = get_object_or_404(Property, id=property_id)
            
            # Get competitors associated with this property
            competitors = Competitor.objects.filter(
                dp_property_competitor__property_id=property_instance
            ).order_by('competitor_name')
            
            serializer = CompetitorListSerializer(competitors, many=True)
            
            return Response({
                'property_id': property_id,
                'property_name': property_instance.name,
                'competitors': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving competitors for property {property_id}: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving the property competitors',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
