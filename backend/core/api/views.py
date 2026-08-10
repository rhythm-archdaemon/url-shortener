from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import URLCreateSerializer
from .services import generate_short_url
from .models import URL, Click
from django.utils import timezone
from django.db.models import Count
from django.db.models.functions import TruncDate
from datetime import timedelta


# Create your views here.


class ShortenURLView(APIView):
    def get(self, request):
        urls = URL.objects.all().order_by('-created_at')
        data = []
        for url in urls :
            data.append({
                "id": url.id,
                "original_url": url.original_url,
                "short_url": url.short_url,
                "created_at": url.created_at,
                "clicks": url.clicks.count() # aggregating total clicks directly from DB
            })
        return Response(data, status=status.HTTP_200_OK)


    def post(self, request):
        serializer = URLCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            url_obj, created = generate_short_url(
                original_url=serializer.validated_data['original_url']
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        output_serializer = URLCreateSerializer(url_obj)
        
        if created:
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(output_serializer.data, status=status.HTTP_200_OK)


class TrackClickView(APIView):
    
    def post(self, request, short_url_code):
        try:
            url_instance = URL.objects.get(short_url=short_url_code)
            
            # record the click event
            Click.objects.create(url=url_instance)
            
            # return the updated total click count to the client
            total_clicks = url_instance.clicks.count()
            return Response({"clicks": total_clicks}, status=status.HTTP_201_CREATED)
            
        except URL.DoesNotExist:
            return Response({"error": "Short URL not found."}, status=status.HTTP_404_NOT_FOUND)


class URLAnalyticsView(APIView):
    def get(self, request, short_url_code):
        try:
            url_instance = URL.objects.get(short_url=short_url_code)
            
            # calculate total overall clicks
            total_clicks = url_instance.clicks.count()
            
            # calculate time-series history - (clicks per day for the last 7 days)
            seven_days_ago = timezone.now() - timedelta(days=7)
            daily_clicks_query = (
                url_instance.clicks.filter(clicked_at__gte=seven_days_ago)
                .annotate(date=TruncDate('clicked_at'))
                .values('date')
                .annotate(count=Count('id'))
                .order_by('date')
            )
            
            # format the timeline data for chart.js
            timeline = [
                {
                    "date": item['date'].strftime('%Y-%m-%d'),
                    "count": item['count']
                } 
                for item in daily_clicks_query
            ]
            
            return Response({
                "short_url": short_url_code,
                "original_url": url_instance.original_url,
                "total_clicks": total_clicks,
                "timeline": timeline
            }, status=status.HTTP_200_OK)
            
        except URL.DoesNotExist:
            return Response({"error": "Short URL not found."}, status=status.HTTP_404_NOT_FOUND)
