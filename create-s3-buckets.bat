@echo off
echo ==========================================
echo Creating S3 Buckets for Veda Learn
echo ==========================================
echo.

echo [1/2] Creating veda-learn-audio bucket...
aws s3api create-bucket ^
  --bucket veda-learn-audio ^
  --region us-east-1
if %errorlevel% equ 0 (echo [OK] veda-learn-audio created) else (echo [FAILED] veda-learn-audio - bucket may already exist)
echo.

echo Configuring CORS for veda-learn-audio...
echo {"CORSRules":[{"AllowedOrigins":["*"],"AllowedHeaders":["*"],"AllowedMethods":["GET"],"MaxAgeSeconds":3000}]} > cors-audio.json
aws s3api put-bucket-cors ^
  --bucket veda-learn-audio ^
  --cors-configuration file://cors-audio.json
if %errorlevel% equ 0 (echo [OK] CORS configured) else (echo [FAILED] CORS)
del cors-audio.json
echo.

echo [2/2] Creating veda-learn-concepts bucket...
aws s3api create-bucket ^
  --bucket veda-learn-concepts ^
  --region us-east-1
if %errorlevel% equ 0 (echo [OK] veda-learn-concepts created) else (echo [FAILED] veda-learn-concepts - bucket may already exist)
echo.

echo ==========================================
echo S3 Setup Complete!
echo ==========================================
echo.
echo Created buckets:
echo   1. veda-learn-audio (with CORS for presigned URLs)
echo   2. veda-learn-concepts (for RAG seed files)
echo.
echo Note: Update veda-learn-api/.env with these bucket names:
echo   AUDIO_BUCKET=veda-learn-audio
echo   CONCEPTS_BUCKET=veda-learn-concepts
echo.
pause
