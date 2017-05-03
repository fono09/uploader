require 'bundler'
Bundler.require

require 'json'
require 'openssl'
require 'yaml'
require 'erubis'
require 'shared-mime-info'
require 'securerandom'

enable :sessions
set :session_secret, SecureRandom.hex(100) 
set :views, settings.root + '/templates'
set :erb, :escape_html => true

ActiveRecord::Base.default_timezone = :local

ActiveRecord::Base.establish_connection(
	adapter: 'sqlite3',
	database: 'uploader.db'
)

settings = YAML.load_file('./settings.yml')
SECRET = settings['secret']
FILE_SIZE_MAX = settings['file_size_max']
FILE_ENTRY_MAX = settings['file_entry_max']

class CryptUtil 

	def self.make_salt
		return OpenSSL::Random.random_bytes(32)
	end

	def self.encrypt(key,salt)
		iter = 20000
		digest = OpenSSL::Digest::SHA256.new
		len = digest.digest_length
		value = OpenSSL::PKCS5.pbkdf2_hmac(key,salt,iter,len,digest)
		return value
	end

	def self.compare(key_a,key_b)
		unless key_a.length == key_b.length
			return false
		end

		arr = key_b.bytes.to_a
		result = 0
		key_a.bytes.each_with_index do |b,i|
			result |= b ^ arr[i]
		end
		
		result == 0
	end

end

class Upfile < ActiveRecord::Base

	def encrypt!
		if self.dlpass then
			self.dlsalt = CryptUtil.make_salt
			self.dlpass = CryptUtil.encrypt(self.dlpass,self.dlsalt)
		end
		
		if self.delpass then
			self.delsalt = CryptUtil.make_salt
			self.delpass = CryptUtil.encrypt(self.delpass,self.delsalt)
		end
	end

	def compare_dlpass(key)
		return CryptUtil.compare(CryptUtil.encrypt(key,self.dlsalt),self.dlpass)
	end

	def compare_delpass(key)
		return CryptUtil.compare(CryptUtil.encrypt(key,self.delsalt),self.delpass)
	end

	def to_hash_for_output
		return {
			id: self.id,
			name: self.name,
			comment: self.comment,
			dl_locked: (self.dlpass)? true : false,
			del_locked: (self.delpass)? true : false,
			last_updated: self.last_updated.to_s,
		}
	end

end

get '/' do
	send_file("./public/index.html")
end

get '/info' do
	files = Upfile.count
	pages = (files / 25).ceil + (files%25!=0?1:0);
	return { 'files' => files, 'pages'=> pages }.to_json
end

get /\/list(\/(\d+))?/ do
	page_num = params['captures'][1].to_i if params['captures']
	unless page_num then
		upfiles = Upfile.all.order("id desc")
	else
		per = 25
		upfiles = Upfile.page(page_num).per(per).order("id desc")
	end
	files = [];
	upfiles.each do |upfile|
		files.push(upfile.to_hash_for_output);
	end
	return files.to_json
end

get '/show/:id' do
	upfile = Upfile.find(params['id'])
	upfile.to_hash_for_output.to_json
end
	
post '/upload' do
	return 400 unless params[:body]

	params.reject!{ |k,v| v=="" }

	upfile_params={}
	upfile_params[:name] = params[:body][:filename]
	upfile_params[:comment] = params[:comment] 
	upfile_params[:delpass] = params[:delpass]
	upfile_params[:dlpass] = params[:dlpass]
	
	return 400 if params[:body][:tempfile].size > FILE_SIZE_MAX 

	upfile = Upfile.new(upfile_params)
	upfile.encrypt!
	upfile.save

	File.open("./src/#{upfile.id}","wb"){|f| f.write(params[:body][:tempfile].read)}

	{id:upfile.id}.to_json
end

post '/download/:id' do
	if params['id'] == 'manager' && params['dlpass'] == SECRET then
		session['manager'] = true
		return {manager: true}.to_json
	end
		
	upfile = Upfile.find(params['id'])

	return 405 if !upfile.dlpass || params['dlpass']=="" || params['dlpass']==nil
	return 401 unless upfile.compare_dlpass(params['dlpass'])
	session[upfile.id] = true
	{id: upfile.id }.to_json
end

get /\/download\/([\d]+)(:mime)?/ do |id,mime| 
	
	upfile = Upfile.find(id)

	if upfile.dlpass && !session[upfile.id] then
		redirect to('/uploader/cushon/'+upfile.id.to_s)
	end

	if mime=="" then
		response.headers['X-Accel-Redirect'] =  "/uploader_files/#{upfile.id}"
		response.headers['Content-Disposition'] = "attachment; filename=\"#{upfile.name}\""
		response.headers['Content-Type'] = 'Application/octet-stream'
	else
		response.headers['X-Accel-Redirect'] =  "/uploader_files/#{upfile.id}"
		response.headers['Content-Disposition'] = "attachment; filename=\"#{upfile.name}\""
		response.headers['Content-Type'] = MIME.check("./src/#{upfile.id}").content_type
	end
	200
end

get '/download/manager' do
	redirect to('/uploader')
end

post '/delete/:id' do
	upfile = Upfile.find(params['id'])
	unless session['manager'] then
		return 401 unless upfile.delpass 
		return 401 unless upfile.compare_delpass(params['delpass'])
	end
	File.delete("./src/#{upfile.id}")
	upfile.destroy
end

get '/cushon/:id' do
	upfile = Upfile.find(params['id'])
	@id = upfile.id
	@name = upfile.name
	@last_updated = upfile.last_updated.to_s
	@dlpass = upfile.dlpass ? true : false
	@comment = upfile.comment
	if !upfile.dlpass && MIME.check("./src/#{upfile.id}").content_type =~ /image/ && File.size("./src/#{upfile.id}")>= 10**6 && !File.exist?("./public/thumbs/#{upfile.id}") then
		img = Magick::Image.read("./src/#{upfile.id}").first
		img.resize!(10**6/img.filesize.to_f)
		img.write("jpeg:"+"./public/thumbs/#{upfile.id}");
	end

	if File.exists?("./public/thumbs/#{upfile.id}") then
		@image = "/uploader/thumbs/#{upfile.id}"
	else
		@image = "/uploader/download/#{upfile.id}:mime"
	end

	erb :cushon
end



error 400 do
	'Bad Request'
end

error 401 do
	'Authentication Failed'
end

error 403 do
	'Forbidden'
end

error 404 do
	'Not Found'
end

error 405 do
	'Method Not Allowed'
end

error ActiveRecord::RecordNotFound do
	redirect 404
end
