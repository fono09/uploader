# uploader
Main Service at uploader.fono.jp

GET / => WebUI  
GET /list => File list in JSON  
POST /upload <= multipart/form-data file, comment, dlpass, and delpass => File id in JSON  
GET /download/:id => File(dlpass == null)  
POST /donwload/:id <= dlpass => File  

