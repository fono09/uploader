# uploader
Main Service at uploader.fono.jp

GET / => WebUI  
GET /list => File list in JSON  
POST /upload <= multipart/form-data file, comment, dlpass, and delpass => File id in JSON  
GET /download/:id => File if dlpass == null)  
GET /download/:id:mime(:mime is string) => File (True MimeType)  
POST /donwload/:id <= dlpass (session[:id] = true after GET /download allowed)  
GET /cushon/:id => Download Page with Twitter Card header  
