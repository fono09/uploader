#!/bin/sh

rm -v uploader.db
sqlite3 uploader.db < create_table.sql

rm -rv src
mkdir src

rm -rv public/thumbs
mkdir public/thumbs

passenger-config restart-app /var/www/uploader
