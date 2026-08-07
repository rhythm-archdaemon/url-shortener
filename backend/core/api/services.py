from .models import URl
import string
import secrets

def generate_short_url(original_url: str):
    existing = URL.objects.filter(original_url)=original_url).first()
    if existing:
        return existing, False # here false indicates it is newly created
    
    max_retries = 10
    attempts = 0

    char = string.ascii_letters + string.digits

    while attempts < max_retries:
        short_code = ''.join(secrets.choice(char) for _ in range (6))

        # check if the generated short code is unique:
        if not URL.objects.filter(short_url = short_code).exists():

            url = URL.objects.create(
                original_url = original_url,
                short_url = short_code
            )

            return url, True # here, true indicates it is newly created

        attempts += 1

    raise Exception("Service Exception: Failed to generate a unique short URL after multiple attempts")
