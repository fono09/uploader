require 'active_record'
require 'sinatra'
require 'json'
require 'openssl'
require 'yaml'
require 'erb'
require 'shared-mime-info'

enable :sessions
set :views, settings.root + '/templates'

ActiveRecord::Base.default_timezone = :local
ActiveRecord::Base.establish_connection(
	adapter: 'sqlite3',
	database: 'uploader.db'
)

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

end

get '/list' do
	@upfiles = Upfile.all
	files = [];
	@upfiles.each do |upfile|
		data = {}
		data[:id] = upfile.id
		data[:name] = upfile.name
		data[:comment] = upfile.comment
		data[:dl_locked] = (upfile.dlpass)? true : false
		data[:del_locked] = (upfile.delpass)? true : false
		data[:last_updated] = upfile.last_updated.to_s
		files.push(data);
	end
	files.to_json
end

post '/upload' do
	return 400 unless params[:body]
	upfile_params={}
	upfile_params[:name] = params[:body][:filename]
	
	upfile_params[:comment] = params[:comment] 
	upfile_params[:comment] = nil if params[:comment]==""

	upfile_params[:delpass] = params[:delpass]
	upfile_params[:delpass] = nil if params[:delpass]==""
	
	upfile_params[:dlpass] = params[:dlpass]
	upfile_params[:dlpass] = nil if params[:dlpass] == ""
	
	upfile=Upfile.new(upfile_params)
	upfile.encrypt!
	upfile.save

	File.open("./src/#{upfile.id}","wb"){|f|f.write(params[:body][:tempfile].read)};
	{id:upfile.id}.to_json
end

post '/download/:id' do
	upfile = Upfile.find(params['id'])

	return 405 if !upfile.dlpass || params['dlpass']=="" || params['dlpass']==nil
	return 401 unless upfile.compare_dlpass(params['dlpass'])
	session[upfile.id] = true
	{id: upfile.id}.to_json
end

get '/download/:id' do 
	upfile = Upfile.find(params['id'])
	
	unless upfile.dlpass then
		send_file "./src/#{upfile.id}",:filename => upfile.name, :type=>'Application/octet-stream' 
	else
		return 405 unless session[params['id']]
		send_file "./src/#{upfile.id}",:filename => upfile.name, :type=>'Application/octet-stream' 
	end
end

post '/delete/:id' do
	upfile = Upfile.find(params['id'])
	return 401 unless upfile.delpass
	return 401 unless upfile.compare_delpass(params['delpass'])
	File.delete("./src/#{upfile.id}")
	upfile.destroy
end

get '/cushon/:id' do
	upfile = Upfile.find(params['id'])
	@id = upfile.id
	@name = upfile.name
	@last_updated = upfile.last_updated.to_s
	@dlpass = upfile.dlpass ? true : false
	@image = (MIME.check("./src/#{upfile.id}").content_type =~ /image/) ? true : false
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
	404
end


