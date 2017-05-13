FROM ruby:2.3-alpine

RUN apk add --update --no-cache git imagemagick-dev sqlite sqlite-dev make gcc musl-dev linux-headers tzdata && \
	mkdir -p /var/www && \
	git clone https://github.com/fono09/uploader /var/www/uploader && \
	mkdir -p /var/www/uploader/run && mkdir -p /var/www/uploader/log && \
	mkdir -p /var/www/uploader/src && mkdir -p /var/www/uploader/public/thumbs && \
	cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
	apk del tzdata && \
	cd /var/www/uploader && \
	if [ ! -e uploader.db ]; then sqlite3 uploader.db < create_table.sql

WORKDIR /var/www/uploader

CMD ["unicorn", "-c", "unicorn.rb"]
