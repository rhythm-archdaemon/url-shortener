from rest_framework import serializers
from .models import URL

class URLCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = URL
        fields = ['id', 'original_url', 'short_url', 'created_at']
        read_only_fields = ['id', 'short_url', 'created_at']
