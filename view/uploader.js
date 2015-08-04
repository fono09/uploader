$(function(){

	$('#upfile').submit(function (event){

		event.preventDefault();

		var form = $('#upfile').get(0);
		var form_data = new FormData(form);

		console.log(form);
		console.log(form_data);

		$.ajax({
			url: 'http://fono.jp:4567/upload',
			method: 'POST',
			dataType: 'json',
			contentType: false,
			processData: false,
			data: form_data,
		}).done(function(result){
			console.log('success',res);
		}).fail(function( jqXHR, textStatus, errorThrown ){
			console.log('fail',jqXHR,textStatus,errorThrown);
		});

		return false;
	});

});




