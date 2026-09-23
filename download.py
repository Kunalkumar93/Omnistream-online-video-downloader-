import yt_dlp
url = input("enter video url : ")
ydl_opts = {}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    ydl.download([url])
print("video download successfully")