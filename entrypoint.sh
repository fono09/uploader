#!/bin/sh

cd /var/www/uploader

if [ ! -e uploader.db ]; then
	sqlite3 uploader.db < create_table.sql
fi

unicorn -c unicorn.rb
