'use strict';

var api_url = location.protocol + '//' + location.host + '/';

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
			url: api_url+'upload',
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

	if($(".dl_locked").length){
		$(this).trigger('setLockedLink')
	}

}).on('drawTable', function(d,num){
	console.log('drawTable');

	$.ajax({
		url: api_url+'info',
		async: true,
		method: 'GET',
		dataType: 'json',
	}).done(function(result){
		
		if(!num){
			num = 1;
		}
		var pager = $('.switcher .pagination');
	
		var prev_idx = $('.switcher .pagination li').index($('.switcher .pagination li.active'));
		//生成前prev_idx = -1,再生成時は値の保全となる為必ず再生成前に実行
		
		if($('.switcher .pagination li').length != (result.pages+2)*2){
			$('.switcher .pagination').empty();
			
			var current = $('<li>').attr('onclick','$(document).trigger(\'drawTable\',\'prev\');return false').appendTo(pager);
			$('<a>').attr('href','#').attr('aria-label','Previous').html('<span aria-hidden="true">&laquo;</span>').appendTo(current);
				
			for(var i = 0; i < result.pages; i++){
				
				current = $('<li>').attr('onclick','$(document).trigger("drawTable",'+(i+1)+');return false').appendTo(pager);
				$('<a>').attr('href','#').text(i+1).appendTo(current);
			}
			
			current = $('<li>').attr('onclick','$(document).trigger("drawTable","next");return false').appendTo(pager);
			$('<a>').attr('href','#').attr('aria-label','Next').html('<span aria-hidden="true">&raquo;</span>').appendTo(current);

		}
		//存在しないか過不足の発生で(再)生成
		
		if(num == 'prev'){
			num = prev_idx - 1;
			if(prev_idx == 1){
				num = result.pages;
			}
		}else if(num=='next'){
			num = prev_idx + 1;
			if(prev_idx == result.pages){
				num = 1;
			}
		}else if(typeof num == "string"){
			num = 1;
		}
		var table_data_url = api_url+'list/'+num;
		//相対のポジション指定


		var children = $('.switcher .pagination li');
		var active_children = $('.switcher .pagination li.active');
		if(prev_idx == -1){
			children.eq(1).addClass('active');
			children.eq(result.pages+3).addClass('active');
		}else if(prev_idx != num){
			active_children.removeClass('active');
			children.eq(num).addClass('active');
			children.eq(result.pages+2+num).addClass('active');
		}
		//以前のポジション取得して違えばポジション更新

		$.ajax({
			url: table_data_url,
			async: true,
			method: 'GET',
			dataType: 'json',
		}).done(function(result){
			console.log('success',result);
			var table = $("#file_list");
			table.empty();

			var show_event = function(e){
				console.log('show_event');
				var toggle_class = $('#file_list tr td:contains("' + $(e.target).text() + '")').attr('class');
				if(localStorage.getItem('hide-'+toggle_class)){
					localStorage.removeItem('hide-'+toggle_class);
				}
				$('#file_list tr td.'+toggle_class).fadeIn();
				$(e.target).fadeOut(null,function(){$(e.target).remove()});

			}

			var hide_event = function(e){
				console.log('hide_event');
				var toggle_class = $(e.target).attr('class');
				var toggle_text = $(e.target).text();
				var toggle_target = $('#file_list tr td.'+toggle_class);
				var span = $('<span>').addClass('label label-default '+toggle_class).text(toggle_text).on('click',show_event).hide().appendTo($('.hidden-columns'));
				if(!localStorage.getItem('hide-'+toggle_class)){
					localStorage.setItem('hide-'+toggle_class,true);
				}
				span.fadeIn();
				toggle_target.fadeOut();
			}

			var label = $('<tr>').appendTo(table);
			var columns = ['ID','NAME','COMMENT','DATE','DEL','TWEET'];
			columns.forEach(function(elem){
				$('<td>').text(elem).addClass('cell-'+elem).appendTo(label).on('click',hide_event);
			});

			result.forEach(function(row){
				var tr = $('<tr>').appendTo(table);

				var dl_link = $('<a>').attr('href',api_url+'download/' + row.id);
				if(row.dl_locked){
					dl_link.addClass('dl_locked').on('click',function(e){ e.preventDefault(); ajaxPostDownload(row.id) });
				}
				dl_link.text(row.name);

				var del_link = $('<a>').attr('href','#').on('click',function(e){ e.preventDefault(); ajaxPostDelete(row.id) });
				del_link.text('Del');

				var tw_dl_url = encodeURI(api_url+'cushon/'+row.id);

				var tw_link = $('<a>').attr('href',
					'https://twitter.com/intent/tweet?text=Download%20'
					+ row.name + ' ' + tw_dl_url
					).text('Tweet').on('click', function(){
						window.open(encodeURI(decodeURI(this.href)), 'tweetwindow', 'width=650, height=470, personalbar=0, toolbar=0, scrollbars=1, sizable=1');
						return false;
					});

				var cells = [];
				cells.push($('<td>').text(row.id));
				cells.push($('<td>').append(dl_link));
				cells.push($('<td>').text(row.comment));
				cells.push($('<td>').text(row.last_updated));

				if(row.del_locked){
					cells.push($('<td>').append(del_link));
				}else{
					cells.push($('<td>').text('N/A'));
				}

				cells.push($('<td>').append(tw_link));
				cells.forEach(function(elem,idx,arr){
					elem.addClass('cell-'+columns[idx]).appendTo(tr);
				});
			});
			
			columns.forEach(function(obj){
				var target_class = 'cell-'+obj;
				if(localStorage.getItem('hide-'+target_class)){
					$('#file_list tr td.'+target_class).hide();
					if($('.hidden-columns .'+target_class).length < 1){
						$('<span>').addClass('label label-default '+target_class).text(obj).on('click',show_event).appendTo($('.hidden-columns'));
					}
				}
			});
					
		}).fail(function(jqXHR, textStatus, errorThrown){
			console.log('fail',jqXHR,textStatus,errorThrown);
		});

	});
	return false;


}).on('createProgressbar',function(d,token_id){

	console.log('createProgressbar',token_id);
	var outer = $('<div>').addClass('progress').attr('token',token_id).appendTo($('.progress_list'));
	var inner = $('<div>').addClass('progress-bar progress-bar-striped active').attr('role','progressbar').attr('aria-valuenow',0).attr('aria-valuemin',0).attr('aria-valuemax',100);

	inner.appendTo(outer);

}).on('updateProgressbar', function(d,e,token_id,token_name){
	if(e == null){return};

	console.log('updateProgressbar',token_id,token_name);
	var percentage = Math.floor(e.loaded / e.total * 100);
	$('.progress_list [token='+token_id+'] div').html('<span>'+token_name+':'+percentage+'%</span>').attr('aria-valuenow',percentage).width(percentage+'%');

	return e;

}).on('destroyProgressbar',function(d,token_id){

	console.log('destroyProgressbar');
	$('.progress_list [token='+token_id+']').remove();

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
				url: api_url+'download/'+id,
				method: 'POST',
				dataType: 'json',
				data: 'dlpass='+dlpass,
			}).done(function(result){
				console.log('sessionWriteSuccess',result);
				location.href=api_url+'download/'+id;
			}).fail(function(result){
				console.log('sessionWriteFail',result);
				alert('Authentication Failed');
			});
			}

			function ajaxPostDelete(id){
				console.log("ajaxPostDelete("+id+")");

				var delpass = window.prompt('Delete Password Required','');
				$.ajax({
					url: api_url+'delete/'+id,
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
