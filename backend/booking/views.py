from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
import logging

from .models import Competitor
from .serializers import (
    CompetitorCreateSerializer, 
    CompetitorDetailSerializer, 
    CompetitorListSerializer,
    BulkCompetitorCreateSerializer
)
from dynamic_pricing.models import Property, DpPropertyCompetitor

# Get logger for booking views
logger = logging.getLogger(__name__)


class BulkCompetitorCreateView(APIView):
    """
    API endpoint for creating multiple competitors at once
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Create multiple competitors for a property with booking URLs
        """
        try:
            serializer = BulkCompetitorCreateSerializer(data=request.data)
            
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
                property_id = serializer.validated_data.get('property_id')
                if property_id:
                    # Create the property-competitor relationship
                    try:
                        property_instance = Property.objects.get(id=property_id)
                        dp_property_competitor, created = DpPropertyCompetitor.objects.get_or_create(
                            property_id=property_instance,
                            competitor_id=competitor
                        )
                        
                        if created:
                            logger.info(f"Created property-competitor relationship: {property_id} - {competitor.competitor_id}")
                        else:
                            logger.info(f"Property-competitor relationship already exists: {property_id} - {competitor.competitor_id}")
                            
                    except Property.DoesNotExist:
                        logger.error(f"Property {property_id} not found when creating competitor relationship")
                        # Continue anyway since the competitor was created successfully
                
                # Return the created competitor with full details
                detail_serializer = CompetitorDetailSerializer(competitor)
                
                logger.info(f"Competitor created successfully: {competitor.competitor_id} - {competitor.competitor_name}")
                
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
            competitor = get_object_or_404(Competitor, competitor_id=competitor_id)
            serializer = CompetitorDetailSerializer(competitor)
            
            return Response({
                'competitor': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving competitor {competitor_id}: {str(e)}")
            return Response({
                'message': 'An error occurred while retrieving the competitor',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request, competitor_id):
        """
        Update a specific competitor by ID
        """
        try:
            competitor = get_object_or_404(Competitor, competitor_id=competitor_id)
            serializer = CompetitorDetailSerializer(competitor, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                
                logger.info(f"Competitor updated successfully: {competitor_id}")
                
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
            logger.error(f"Error updating competitor {competitor_id}: {str(e)}")
            return Response({
                'message': 'An error occurred while updating the competitor',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, competitor_id):
        """
        Delete a specific competitor by ID (soft delete by setting valid_to)
        """
        try:
            competitor = get_object_or_404(Competitor, competitor_id=competitor_id)
            from django.utils import timezone
            competitor.valid_to = timezone.now()
            competitor.save()
            
            logger.info(f"Competitor deactivated successfully: {competitor_id}")
            
            return Response({
                'message': 'Competitor deactivated successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error deactivating competitor {competitor_id}: {str(e)}")
            return Response({
                'message': 'An error occurred while deactivating the competitor',
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
            is_currently_valid = request.query_params.get('is_currently_valid')
            property_id = request.query_params.get('property_id')
            
            # Build queryset
            queryset = Competitor.objects.all()
            
            if is_currently_valid is not None:
                is_valid = is_currently_valid.lower() == 'true'
                if is_valid:
                    queryset = queryset.filter(valid_to__isnull=True)
                else:
                    queryset = queryset.filter(valid_to__isnull=False)
            
            if property_id:
                # Filter competitors that are associated with the specific property
                queryset = queryset.filter(
                    dp_property_competitor__property_id=property_id
                )
            
            # Order by creation date (newest first)
            queryset = queryset.order_by('-valid_from')
            
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
            ).order_by('-valid_from')
            
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
