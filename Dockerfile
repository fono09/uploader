FROM ubuntu:16.04

RUN apt update && apt upgrade -y && \
	apt install -y --force-yes ruby2.3 ruby2.3-dev build-essential libmagickwand-dev imagemagick libsqlite3-dev && \
	cd /var/www/uploader && \
	gem install bundle && \
	bundle && \
	bundle exec unicorn -c unicorn.rb
EXPOSE 4567
CMD ["bundle", "exec", "unicorn", "-c", "unicorn.rb"]
