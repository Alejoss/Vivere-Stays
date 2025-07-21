from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
import logging

from .models import Property, PropertyManagementSystem
from .serializers import (
    PropertyCreateSerializer, 
    PropertyDetailSerializer, 
    PropertyListSerializer,
    PropertyManagementSystemSerializer
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
        Create a new property with the provided data
        """
        try:
            serializer = PropertyCreateSerializer(data=request.data)
            
            if serializer.is_valid():
                property_instance = serializer.save()
                
                # Return the created property with full details
                detail_serializer = PropertyDetailSerializer(property_instance)
                
                logger.info(f"Property created successfully: {property_instance.id} - {property_instance.name}")
                
                return Response({
                    'message': 'Property created successfully',
                    'property': detail_serializer.data
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
