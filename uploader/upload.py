import os
import sys
import json
import base64
import requests
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# Configuration
SERVER_URL = "https://11ea-49-43-162-83.ngrok-free.app" # Default ngrok URL or change via env
if "SERVER_URL" in os.environ:
    SERVER_URL = os.environ["SERVER_URL"]

CLIENT_SECRETS_FILE = "client_secrets.json"
SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
API_SERVICE_NAME = "youtube"
API_VERSION = "v3"

def get_authenticated_service():
    credentials = None
    if os.path.exists("token.json"):
        credentials = Credentials.from_authorized_user_file("token.json", SCOPES)
    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            if not os.path.exists(CLIENT_SECRETS_FILE):
                print(f"Error: {CLIENT_SECRETS_FILE} not found. You need to create OAuth2 credentials in Google Cloud Console.")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)
            credentials = flow.run_local_server(port=0)
        with open("token.json", "w") as token:
            token.write(credentials.to_json())
    return build(API_SERVICE_NAME, API_VERSION, credentials=credentials)

def upload_video(youtube, details):
    title = details.get('title', 'Untitled')
    description = details.get('description', '')
    tags = details.get('tags', [])
    privacy_status = details.get('privacyStatus', 'private')
    video_path = details.get('localVideoPath')

    if not video_path or not os.path.exists(video_path):
        raise Exception(f"Video file not found at: {video_path}")

    print(f"Uploading video: {title}")
    
    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags,
            "categoryId": "22" # 22 is usually "People & Blogs" or "Education" depending on the region, change if needed
        },
        "status": {
            "privacyStatus": privacy_status,
            "selfDeclaredMadeForKids": False
        }
    }

    insert_request = youtube.videos().insert(
        part=",".join(body.keys()),
        body=body,
        media_body=MediaFileUpload(video_path, chunksize=-1, resumable=True)
    )

    response = None
    while response is None:
        status, response = insert_request.next_chunk()
        if status:
            print(f"Uploaded {int(status.progress() * 100)}%")

    print("Upload Complete!")
    video_id = response.get("id")
    print(f"Video ID: {video_id}")
    
    # Upload thumbnail if available
    if details.get('thumbnailBase64'):
        print("Uploading thumbnail...")
        thumbnail_data = base64.b64decode(details['thumbnailBase64'])
        thumb_path = "temp_thumbnail.jpg"
        with open(thumb_path, "wb") as f:
            f.write(thumbnail_data)
            
        youtube.thumbnails().set(
            videoId=video_id,
            media_body=MediaFileUpload(thumb_path)
        ).execute()
        
        os.remove(thumb_path)
        print("Thumbnail uploaded!")

    return f"https://youtu.be/{video_id}"

def main():
    if len(sys.argv) < 2:
        print("Usage: python upload.py <topic_id>")
        sys.exit(1)
        
    topic_id = sys.argv[1]
    
    # 1. Fetch details from server
    print(f"Fetching details for topic {topic_id} from {SERVER_URL}...")
    try:
        res = requests.get(f"{SERVER_URL}/api/topics/{topic_id}/upload-details")
        res.raise_for_status()
        data = res.json()
        if not data.get("success"):
            raise Exception(data.get("message", "Unknown error from server"))
        details = data.get("data", {})
    except Exception as e:
        print(f"Error fetching details: {e}")
        sys.exit(1)
        
    if not details.get('localVideoPath'):
        print("Error: localVideoPath is not set for this topic. Please set it on the frontend.")
        sys.exit(1)

    # 2. Authenticate
    youtube = get_authenticated_service()
    
    # 3. Upload Video
    try:
        youtube_url = upload_video(youtube, details)
        
        # 4. Report success
        print(f"Reporting success to server: {youtube_url}")
        res = requests.post(f"{SERVER_URL}/api/topics/{topic_id}/upload-status", json={
            "status": "success",
            "youtubeUrl": youtube_url
        })
        res.raise_for_status()
        print("Done!")
    except Exception as e:
        print(f"Upload failed: {e}")
        # Report failure
        try:
            requests.post(f"{SERVER_URL}/api/topics/{topic_id}/upload-status", json={
                "status": "failed",
                "errorMessage": str(e)
            })
        except:
            pass
        sys.exit(1)

if __name__ == "__main__":
    main()
