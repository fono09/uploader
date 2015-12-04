'use strict';

$(function(){

	$('#upfile').submit(function (event){

		event.preventDefault();

		var form = $('#upfile').get(0);
		var form_data = new FormData(form);
		console.log(form_data);

		var token_id = 'up'+genUID();
		var token_name = $('[name=body]').prop('files')[0].name;
		$(document).trigger('createProgressbar',token_id);
		
		$.ajax({
			url: 'https://uploader.fono.jp/upload',
			async: true,
			xhr: function(){
				var __xhr__ = $.ajaxSettings.xhr();
				__xhr__.upload.addEventListener("progress", function(e){
					$(document).trigger('updateProgressbar',[e,token_id,token_name]);
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
			$(document).trigger('destroyProgressbar',token_id);
			$(document).trigger('drawTable');
		}).fail(function(jqXHR, textStatus, errorThrown){
			console.log('fail',jqXHR,textStatus,errorThrown);
			$(document).trigger('destroyProgressbar',token_id);
			$(document).trigger('drawTable');
			alert('Uploading Failed!!');
		});

		$('#upfile')[0].reset();

		return false;
	});

});

$(document).ready(function(){

	if($("#file_list").length){
		$(this).trigger('drawTable');
	}	

	if($("#pager").length){
		$(this).trigger('drawPager');
	}

	if($(".dl_locked").length){
		$(this).trigger('setLockedLink')
	}


}).on('drawPager', function(){
	$.ajax({
		url: 'https://uploader.fono.jp/info',
		async: true,
		method: 'GET',
		dataType: 'json',
	}).done(function(result){
		
		for(var i=0; i < result.pages; i++){
			$('<button>').attr('onclick','$(document).trigger(\'drawTable\','+(i+1)+')').addClass('btn btn-default').attr('type','button').text(i+1).appendTo($('#pager'));
		}
		$('<button>').on('click','$(document).trigger(\'drawTable\',\'all\')').addClass('btn btn-default').attr('type','button').text('all').appendTo($('#pager'));
	});

}).on('drawTable', function(d,num){
	console.log('drawTable');
	
	var url = 'https://uploader.fono.jp/list'
	if(typeof num == 'number'){
		url += '/'+num;
	}else if(num == null){
		url += '/1';
	}

	$.ajax({
		url: url,
		async: true,
		method: 'GET',
		dataType: 'json',
	}).done(function(result){
		console.log('success',result);
		var table = $("#file_list");
		table.empty();

		result.forEach(function(row){
			var tr = $('<tr>').appendTo(table);

			var dl_link = $('<a>').attr('href','/download/' + row.id);
			if(row.dl_locked){
				dl_link.addClass('dl_locked').on('click',function(e){ e.preventDefault(); ajaxPostDownload(row.id) });
			}
			dl_link.text(row.name);

			var del_link = $('<a>').attr('href','#').on('click',function(e){ e.preventDefault(); ajaxPostDelete(row.id) });
			del_link.text('locked');

			var tw_link = $('<a>').attr('href',
				'https://twitter.com/intent/tweet?original_referer=https%3A%2F%2Fuploader.fono.jp%2F&ref_src=twsrc%5Etfw&text=Download%20'
				+ row.name
				+ '&url=https%3A%2F%2Fuploader.fono.jp%2Fcushon%2F'
				+ row.id).text('Tweet').on('click', function(){
					window.open(encodeURI(decodeURI(this.href)), 'tweetwindow', 'width=650, height=470, personalbar=0, toolbar=0, scrollbars=1, sizable=1');
					return false;
				});

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
			$('<td>').append(tw_link).appendTo(tr);
		});

		
		var label = $('<tr>').prependTo(table);
		$('<td>').text('ID').appendTo(label);
		$('<td>').text('NAME').appendTo(label);
		$('<td>').text('COMMENT').appendTo(label);
		$('<td>').text('DATE').appendTo(label);
		$('<td>').text('DEL').appendTo(label);
		$('<td>').text('DL').appendTo(label);
		$('<td>').text('TWEET').appendTo(label);

	}).fail(function(jqXHR, textStatus, errorThrown){
		console.log('fail',jqXHR,textStatus,errorThrown);
	});


}).on('createProgressbar',function(d,token_id){

	console.log('createProgressbar',token_id);
	$('<div>').addClass('progress-bar progress-bar-striped active').attr('role','progressbar').attr('aria-valuenow',0).attr('aria-valuemin',0).attr('aria-valuemax',100).attr('token',token_id).appendTo($('.progress_list'));
	
}).on('updateProgressbar', function(d,e,token_id,token_name){
	if(e == void(0)){return};

	console.log('updateProgressbar',token_id,token_name);
	var percentage = Math.floor(e.loaded / e.total * 100);
	var val = $('.progress_list').find('[token='+token_id+']')[0];
	$(val).html('<span>'+token_name+':'+percentage+'%</span>').attr('aria-valuenow',percentage).width(percentage+'%');

	return e;

}).on('destroyProgressbar',function(d,token_id){

	console.log('destroyProgressbar');
	$('.progress_list').find('[token='+token_id+']')[0].remove();

}).on('setLockedLink', function(d,e){
	
	$('.dl_locked').on('click',function(e){ e.preventDefault(); e.currentTarget.href.match(/\/(\d+)$/); ajaxPostDownload(RegExp.$1) });

});

function genUID(){
	var rand = Math.floor(Math.random()*1000)
	var date = new Date();
	var time = date.getTime();
	return rand + time.toString();
}
	
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
