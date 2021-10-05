$(document).ready(function(){
	$('#coffee-close').click(function ()
	{
		$('#coffee').toggleClass('fade');
		$('#coffee').hide();
	});

	$('#coffee-open').click(function ()
	{
		$('#coffee').toggleClass('show');
		$('#coffee').show();
	});
});