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
				__xhr__ = $.ajaxSettings.xhr();
				__xhr__.upload.addEventListener("progress", updateProgressbar, false);
				return __xhr__;
			},
			method: 'POST',
			dataType: 'json',
			contentType: false,
			processData: false,
			data: form_data,
		}).done(function(result){
			console.log('success',result);
		}).fail(function(jqXHR, textStatus, errorThrown){
			console.log('fail',jqXHR,textStatus,errorThrown);
		});

		return false;
	});

});

$(document).ready(function(){
	
	$.ajax({
		url: 'http://uploader.fono.jp/list',
		async: true,
		method: 'GET',
		dataType: 'json',
	}).done(function(result){
		console.log('success',result);
	}).fail(function(jqXHR, textStatus, errorThrown){
		console.log('fail',jqXHR,textStatus,errorThrown);
	});


});
	

function updateProgressbar(e){

	console.log((e.loaded / e.total)*100 + "%");
	$('#upload_progress').val(Math.floor(e.loaded / e.total * 100));
	
	return e;

}




