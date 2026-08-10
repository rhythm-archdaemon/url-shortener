from django.urls import path
from .views import ShortenURLView, TrackClickView, URLAnalyticsView

urlpatterns = [
    path('shorten/', ShortenURLView.as_view(), name='shorten-url'),
    path('analytics/<str:short_url_code>/click/', TrackClickView.as_view(), name='track-click'),
    path('analytics/<str:short_url_code>/', URLAnalyticsView.as_view(), name='url-analytics'),
]
