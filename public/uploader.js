'use strict';

$(function(){

	$('#upfile').submit(function (event){

		event.preventDefault();

		var form = $('#upfile').get(0);
		var form_data = new FormData(form);

		console.log(form);
		console.log(form_data);

		$.ajax({
			url: 'https://uploader.fono.jp/upload',
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
		url: 'https://uploader.fono.jp/list',
		async: true,
		method: 'GET',
		dataType: 'json',
	}).done(function(result){
		console.log('success',result);
		var table = $("#file_list");
		table.empty();

		result.forEach(function(row){
			var tr = $('<tr>').prependTo(table);

			var dl_link = $('<a>').attr('href','/download/' + row.id);
			if(row.dl_locked){
				dl_link.on('click', function(e){ e.preventDefault(); ajaxPostDownload(row.id) });
			}
			dl_link.text(row.name);

			var del_link = $('<a>').attr('href','#').on('click',function(e){ e.preventDefault(); ajaxPostDelete(row.id) });
			del_link.text('locked');

			$('<td>').text(row.id).appendTo(tr);
			$('<td>').append(dl_link).appendTo(tr);
			$('<td>').text(row.comment).appendTo(tr);
			$('<td>').text(row.last_updated).appendTo(tr);

			if(row.del_locked){
				$('<td>').append(del_link).appendTo(tr);
			}else{
				$('<td>').text('free').appendTo(tr);
			}

			$('<td>').text(row.dl_locked?'locked':'free').appendTo(tr);
		});

		
		var label = $('<tr>').prependTo(table);
		$('<td>').text('ID').appendTo(label);
		$('<td>').text('NAME').appendTo(label);
		$('<td>').text('COMMENT').appendTo(label);
		$('<td>').text('DATE').appendTo(label);
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
	console.log('ajaxPostDownload('+id+')');
	
	var dlpass = window.prompt('Download Password Required','');
	$.ajax({
		url: 'https://uploader.fono.jp/download/'+id,
		method: 'POST',
		dataType: 'json',
		data: 'dlpass='+dlpass,
	}).done(function(result){
		console.log('sessionWriteSuccess',result);
		location.href='https://uploader.fono.jp/download/'+id;
	}).fail(function(result){
		console.log('sessionWriteFail',result);
		alert('Authentication Failed');
	});
}

function ajaxPostDelete(id){
	console.log("ajaxPostDelete("+id+")");

	var delpass = window.prompt('Delete Password Required','');
	$.ajax({
		url: 'https://uploader.fono.jp/delete/'+id,
		method: 'POST',
		detaType: 'json',
		data: 'delpass='+delpass,
	}).done(function(result){
		console.log('deleteSuccess',result);
		$(document).trigger('drawTable');
		alert('Delete Succeeded');
	}).fail(function(result){
		console.log('deleteFailed',result);
		alert('Authentication Failed');
	});
}
