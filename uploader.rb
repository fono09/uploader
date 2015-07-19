require 'active_record'
require 'sinatra'
require 'json'
require 'openssl'
require 'yaml'

settings = YAML.load_file('settings.yml');

ActiveRecord::Base.establish_connection(
	adapter: 'sqlite3',
	database: 'uploader.db'
)

class BFUtil 
	def self.encrypt(text,key)
		cipher = OpenSSL::Cipher::Cipher.new("BF-CBC")
		salt = OpenSSL::Random.random_bytes(8)
		cipher.pkcs5_keyivgen(key,salt,1)
		cipher.encrypt()
		return [
			salt,
			cipher.update(text)+cipher.final
		]
	end

	def self.decrypt(text,key,salt)
		cipher = OpenSSL::Cipher::Cipher.new("BF-CBC")
		cipher.decrypt()
		cipher.pkcs5_keyivgen(key,salt,1)

		return cipher.update(text)+cipher.final
	end
end

class Upfile < ActiveRecord::Base
	def encrypt 
		self.dlsalt,self.dlpass = BFUtil.encrypt(self.dlpass,settings[:private_key]) if self.dlpass

		self.delsalt,self.delpass = BFUtil.encrypt(self.delpass,settings[:private_key]) if self.delpass
	end

	def decrypt
		self.dlpass=BFUtil.decrypt(self.dlpass,settings[:private_key],self.dlsalt) if self.dlpass

		self.delpass=BFUtil.decrypt(self.delpass,settings[:private_key],self.delsalt) if self.delpass
	end
end

helpers do 
	def auth(pass)
		response = callcc do |cont|
			auth = Rack::Auth::Digest::MD5.new(cont,"Input Password") do |username|
				pass
			end

			auth.opaque = $$.to_s
			auth.call(request.env)
		end
		
		401 if response.first == 401
	end
end
		

get '/' do
	@upfiles = Upfile.all
	files = [];
	@upfiles.each do |upfile|
			data = {}
			data[:id] = upfile.ROWID
			data[:name] = upfile.name
			data[:comment] = upfile.comment if upfile.comment
			data[:dl_locked] = defined?(upfile.dlpass)
			data[:del_locked] = defined?(upfile.delpass)
			data[:last_updated] = upfile.last_updated.to_s
			files.push(data);
	end
	files.to_json;
end

post '/' do
	400 unless params[:body] && 
		(tmpfile = params[:body][:tmpfile]) &&
		(name = params[:body][:filename])

	upfile_params={}
	upfile_params[:name] = params[:body][:filename]
	upfile_params[:body] = params[:body][:tmpfile]
	upfile_params[:comment] = params[:comment] if params[:comment]
	upfile_params[:delpass] = params[:delpass] if params[:delpass]
	upfile_params[:dlpass] = params[:dlpass] if params[:dlpass]

	upfile=Upfile.new(upfile_params)
	upfile.encrypt
	upfile.save
	{id: upfile.ROWID}.to_json
end

get '/:id' do 
	if upfile = Upfile.find(params['id']) then
		401 unless upfile.dlpass
		header['Content-Type'] = 'application/octet-stream'
		header['Content-Disposition'] = 'attachment;filename='+upfile.name
		upfile.body
	else
		404
	end
end

post '/:id' do
	if upfile = Upfile.find(params['id']) then
		upfile.decrypt
		if upfile.dlpass == params['password'] then
			header['Content-type'] = 'application/octet-stream'
			header['Content-Disposition'] = 'attachment;filename='+upfile.name
			upfile.body
		else
			403
		end
	else
		404
	end
end

error 400 do
	'Postdata Required'
end
	
error 401 do
	'Post Password Required'
end

error 403 do
	'Password Authentication Failed'
end

error 404 do
	'File Not Found'
end
