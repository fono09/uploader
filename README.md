# uploader
Main Service at uploader.fono.jp

## GET /
responce: WebUI

## GET /list/:page\_num
responce: JSON 
```
[{"id": file_id, "name": file_name, "comment": comment, "dl_locked": bool, "del_locked": bool, "last_updated": timestamp"}.....]
```

## POST /upload
request params: multipart/form-data
file = File(binary)
comment = comment(text)
dlpass = download password
delpass = delete password

responce: JSON
```
{"id": file_id}
```

## GET /download/:id
request params: none
responce: File(without dlpass)

## GET /download/:id[:mime]
request params: id, :mime(string)
responce: File(without dlpass, correct mime type)

## POST /download/:id
request params: id, dlpass
responce: bool
(if session[:id] == true after GET /download/:id allowed)

##  GET /cusion/:id
request params: id
Download page with Twitter Card
