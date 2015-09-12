'use strict';

$(function(){

	$('#upfile').submit(function (event){

		event.preventDefault();

		var form = $('#upfile').get(0);
		var form_data = new FormData(form);

		console.log(form);
		console.log(form_data);

		$.ajax({
			url: 'http://uploader.fono.jp/upload',
			async: true,
			xhr: function(){
				var __xhr__ = $.ajaxSettings.xhr();
				__xhr__.upload.addEventListener("progress", function(e){
					$(document).trigger('updateProgressbar', e);
				}, false);
				return __xhr__;
			},
			method: 'POST',
			dataType: 'json',
			contentType: false,
			processData: false,
			data: form_data,
		}).done(function(result){
			console.log('success',result);
			$(document).trigger('drawTable');
		}).fail(function(jqXHR, textStatus, errorThrown){
			console.log('fail',jqXHR,textStatus,errorThrown);
		});

		return false;
	});

});

$(document).ready(function(){
	
	$(this).trigger('drawTable');
}).on('drawTable', function(){
	console.log('drawTable');
	
	$.ajax({
		url: 'http://uploader.fono.jp/list',
		async: true,
		method: 'GET',
		dataType: 'json',
	}).done(function(result){
		console.log('success',result);
		var table = $("#file_list");
		table.empty();

		result.forEach(function(row){
			var tr = $('<tr>').prependTo(table);

			var link;
			if(row.dl_locked){
				link = $('<a>').attr('href','javascript:ajaxPostDownload(' + row.id + ');');
			}else{
				link = $('<a>').attr('href', '/download/' + row.id);
			}
			link.text(row.name);

			$('<td>').text(row.id).appendTo(tr);
			$('<td>').append(link.text(row.name)).appendTo(tr);
			$('<td>').text(row.comment).appendTo(tr);
			$('<td>').text(row.del_locked?'locked':'free').appendTo(tr);
			$('<td>').text(row.dl_locked?'locked':'free').appendTo(tr);
		});

		
		var label = $('<tr>').prependTo(table);
		$('<td>').text('ID').appendTo(label);
		$('<td>').text('NAME').appendTo(label);
		$('<td>').text('COMMENT').appendTo(label);
		$('<td>').text('DEL').appendTo(label);
		$('<td>').text('DL').appendTo(label);

	}).fail(function(jqXHR, textStatus, errorThrown){
		console.log('fail',jqXHR,textStatus,errorThrown);
	});


}).on('updateProgressbar', function(d,e){

	console.log((e.loaded / e.total)*100 + "%");
	$('#upload_progress').val(Math.floor(e.loaded / e.total * 100));
	
	return e;

});
function ajaxPostDownload(id){
	console.log('ajaxPostDownload(id)');
	
	var dlpass = window.prompt('Download Password Required','');
	$.ajax({
		url: 'http://uploader.fono.jp/download/'+id,
		method: 'POST',
		dataType: 'json',
		data: 'dlpass='+dlpass,
	}).done(function(result){
		console.log('sessionWriteSuccess',result);
		location.href='http://uploader.fono.jp/download/'+id;
	}).fail(function(result){
		console.log('sessionWriteFail',result);
		alert('Authentication Failed');
	});
}
