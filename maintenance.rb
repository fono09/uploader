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

# Maintanance task
Thread.abort_on_exception = true
while Upfile.count > FILE_ENTRY_MAX
	th = Thread.start do
		upfile = Upfile.first
		File.delete("./src/#{upfile.id}") if File.exist?("./src/#{upfile.id}") 
		upfile.destroy
	end
	th.join
end
exit
