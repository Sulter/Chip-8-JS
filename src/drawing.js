function drawing(){
	this.canvas = document.getElementById('screen');
	this.ctx = this.canvas.getContext('2d');
	
}

drawing.prototype.clean_screen = function(){
	this.ctx.clearRect ( 0 , 0 , SCREEN_WIDTH , SCREEN_HEIGHT );
}

drawing.prototype.put_pixel = function(x, y, r, g, b){//should be changed, this is 10x slower on chrome then using image data
	this.ctx.fillStyle = 'rgb('+r+','+g+','+b+')';
	this.ctx.fillRect(x, y, 10, 10 );

}

drawing.prototype.draw_screen = function(){

	this.clean_screen();
	for (var i=0;i<2048;i++){
		var x =  (i % 64)*10;
		var y = (i/64);
		y = y ^ 0;
		y*=10;
		
		
		if(chip.screen[i] > 0)
			this.put_pixel(x, y , 255, 255 ,255); //change from 1d to 2d coords
		if(chip.screen[i] == 0)
			this.put_pixel(x, y , 0 ,0 ,0 );
	}
	
}