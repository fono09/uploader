require 'active_record'
require 'sinatra'
require 'json'
require 'openssl'
require 'yaml'

settings = YAML.load_file('settings.yml');

ActiveRecord::Base.default_timezone = :local
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
		@dlsalt,@dlpass = BFUtil.encrypt(@dlpass,settings[:private_key]) if @dlpass

		@delsalt,@delpass = BFUtil.encrypt(@delpass,settings[:private_key]) if @delpass
	end

	def decrypt
		@dlpass=BFUtil.decrypt(@dlpass,settings[:private_key],@dlsalt) if @dlpass

		@delpass=BFUtil.decrypt(@delpass,settings[:private_key],@delsalt) if @delpass
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
		data[:id] = upfile.id
		data[:name] = upfile.name
		data[:comment] = upfile.comment if upfile.comment
		data[:dl_locked] = (upfile.dlpass)? true : false
		data[:del_locked] = (upfile.delpass)? true : false
		data[:last_updated] = upfile.last_updated.to_s
		files.push(data);
	end
	files.to_json
end

post '/upload' do
	400 unless params[:body]
	upfile_params={}
	upfile_params[:name] = params[:body][:filename]
	upfile_params[:comment] = params[:comment] if params[:comment]
	upfile_params[:delpass] = params[:delpass] if params[:delpass]
	upfile_params[:dlpass] = params[:dlpass] if params[:dlpass]
	upfile=Upfile.new(upfile_params)
	upfile.encrypt
	upfile.save

	File.open("./src/#{upfile.id}","wb"){|f|f.write(params[:body][:tempfile].read)};
	{id:upfile.id}.to_json
end

get '/download/:id' do 
	upfile = Upfile.find(params['id'])
	401 unless upfile.dlpass
	send_file "./src/#{upfile.id}",:filename => upfile.name, :type=>'Application/octet-stream' 
end

post '/download/:id' do
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

get '/delete/:id' do
	upfile = Upfile.find(params['id']);
	401 unless upfile.dlpass
	401 unless upfile.delpass
	upfile.destroy
end

error 400 do
	'Postdata Required'
end

error 401 do
	'Password Post Required'
end

error 403 do
	'Password Authentication Failed'
end

error ActiveRecord::RecordNotFound do
	404
end
error 404 do
	'File Not Found'
end
