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
		[self.dlsalt,self.dlpass] = BFUtil.encrypt(self.dlpass,settings[:private_key]) if self.dlpass

		[self.delsalt,self.delpass] = BFUtil.encrypt(self.delpass,settings[:private_key]) if self.delpass
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
			files.push({
				:id => upfile.id,
				:locked => defined?(upfile.dlpass)?true:false,
				:name => upfile.name
			});
	end
	files.to_json;

end

get '/:id' do 

end

post '/' do
	400 unless params[:body] && 
		(tmpfile = params[:body][:tmpfile]) &&
		(name = params[:body][:filename])

	upfile_params={}
	upfile_params[:name] = params[:body][:filename]
	upfile_params[:comment] = params[:comment] if params[:comment]
	upfile_params[:delpass] = params[:delpass] if params[:delpass]
	upfile_params[:dlpass] = params[:dlpass] if params[:dlpass]

	upfile=Upfile.new(upfile_params)
	upfile.encrypt
	upfile.save
	{result: 'success'}.to_json
end
		
error 400 do
	{result: 'failed'}.to_json
end


