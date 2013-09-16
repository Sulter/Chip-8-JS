function chip_cpu(){
	this.opcode = 0; //current opcode
	
	/*FONT*/
	this.chip8_fontset = new Array
	( 
	0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
	0x20, 0x60, 0x20, 0x20, 0x70, // 1
	0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
	0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
	0x90, 0x90, 0xF0, 0x10, 0x10, // 4
	0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
	0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
	0xF0, 0x10, 0x20, 0x40, 0x40, // 7
	0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
	0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
	0xF0, 0x90, 0xF0, 0x90, 0x90, // A
	0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
	0xF0, 0x80, 0x80, 0x80, 0xF0, // C
	0xE0, 0x90, 0x90, 0x90, 0xE0, // D
	0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
	0xF0, 0x80, 0xF0, 0x80, 0x80  // F
	);
	
	/*
	0x000-0x1FF - Chip 8 interpreter (contains font set in emu)
	0x050-0x0A0 - Used for the built in 4x5 pixel font set (0-F)
	0x200-0xFFF - Program ROM and work RAM
	*/
	this.memory = new Array(4096);
	for (var i=0;i<this.memory.length;i++)
		this.memory[i]=0;
		
	//load font into the memory 
	for(var i = 0; i < 80; ++i)
		this.memory[i] = this.chip8_fontset[i];
	
	this.pc = 0x200;//program counter <--- where we actually are in the code! (starts at 0x200)
	
	this.V = new Array(16); //15 general purpose registers and 1 carry flag (V[15])
	for (var i=0;i<this.V.length;i++)
		this.V[i]=0;
	
	this.I = 0;//index register
	
	this.screen = new Array(2048);//64x32 screen
	for (var i=0;i<this.screen.length;i++)
		this.screen[i]=0;
	
	this.delay_timer=0;
	this.sound_timer=0;
	
	this.stack = new Array(16);//stacks
	for (var i=0;i<this.stack.length;i++)
		this.stack[i]=0;
		
	this.sp = 0;//current stack pointer
	
	this.key = new Array(16);//which of the 16 keys are pressed	
	for (var i=0;i<this.key.length;i++)
		this.key[i]=0;
	
	this.draw_flag = false;//if the screen should be redrawned
	
	this.key_press_wait = true; //whatever we are waiting for a key to be pressed
	
	this.VX_key_press_wait; //which register, the key should be stores in, when pressed after waiting
	
}

chip_cpu.prototype.decode_n_execute_opcode = function(){

	this.pc +=2;

	//one big-ass switch with all the opcodes, executing each and every one
	switch(this.opcode & 0xF000)
	{
	case 0x0000:
		switch(this.opcode & 0x00FF)
		{
		case 0x00E0: // 0x00E0: Clears the screen        
			draw.clean_screen();
			for (var i=0;i<this.screen.length;i++)
				this.screen[i]=0;
			break;
			
		case 0x00EE: // 0x00EE: Returns from subroutine    
			this.pc=this.stack[--this.sp];
			break;
 
		default:
			alert('opcode not found!: ' + this.opcode);       
		}
		break;
	
	case 0x1000://1NNN: Jumps to address NNN.
		this.pc = this.opcode & 0x0FFF;
		this.draw_flag = true;
		break;
		
	case 0x2000://2NNN	Calls subroutine at NNN. (warning - not sure if werks)
		this.stack[this.sp] = this.pc;
		this.pc = this.opcode & 0x0FFF;
		this.sp++;
		break;
		
	case 0x3000://3XNN: Skips the next instruction if VX equals NN.
		if(this.V[(this.opcode & 0x0F00) >>8 ] == (this.opcode & 0x00FF)){
			this.pc+=2;
		}
		break;
		
	case 0x4000://4XNN: Skips the next instruction if VX doesn't equal NN.
		if(this.V[(this.opcode & 0x0F00) >>8 ] != (this.opcode & 0x00FF)){
			this.pc+=2;
		}
		break;
		
	case 0x5000://5XY0: Skips the next instruction if VX equals VY.
		if(this.V[(this.opcode & 0x0F00) >>8 ] == this.V[(this.opcode & 0x00F0) >>4 ]){
			this.pc+=2;
		}
		break;
		
	case 0x6000://6XNN: Sets VX to NN.
		this.V[(this.opcode & 0x0F00) >>8 ] = this.opcode & 0x00FF;
		break;
		
	case 0x7000://7XNN:	Adds NN to VX.
		if( (this.V[(this.opcode & 0x0F00) >>8 ] + this.opcode & 0x00FF) > 0xFF)
			this.V[(this.opcode & 0x0F00) >>8 ] = (this.V[(this.opcode & 0x0F00) >>8 ] + this.opcode & 0x00FF) - 256 ; //wrap around if more the 0xFF
		else
			this.V[(this.opcode & 0x0F00) >>8 ] += this.opcode & 0x00FF;
		
		break;
		
	case 0x8000:
		switch(this.opcode & 0x000F)
		{
		case 0x0000: //8XY0: Sets VX to the value of VY.     
			this.V[(this.opcode & 0x0F00) >>8 ] = this.V[(this.opcode & 0x00F0) >>4 ];
			break;
			
		case 0x0001: //8XY1: Sets VX to VX or VY. 
			this.V[(this.opcode & 0x0F00) >>8 ] |= this.V[(this.opcode & 0x00F0) >>4 ];			
			break;
			
		case 0x0002: //8XY2: Sets VX to VX and VY.    
			this.V[(this.opcode & 0x0F00) >>8 ] &= this.V[(this.opcode & 0x00F0) >>4 ];
			break;
			
		case 0x0003: //8XY3: Sets VX to VX xor VY.
			this.V[(this.opcode & 0x0F00) >>8 ] ^= this.V[(this.opcode & 0x00F0) >>4 ];
			break;
			
		case 0x0004: //8XY4: Adds VY to VX. VF is set to 1 when there's a carry, and to 0 when there isn't. 
			if(this.V[(this.opcode & 0x0F00) >>8 ] + this.V[(this.opcode & 0x00F0) >>4 ] > 0xFF){
				this.V[(this.opcode & 0x0F00) >>8 ] = (this.V[(this.opcode & 0x0F00) >>8 ] + this.V[(this.opcode & 0x00F0) >>4 ]) - 256 ; //wrap around if more the 0xFF
				this.V[15] = 1;
			}
			else{
				this.V[(this.opcode & 0x0F00) >>8 ] += this.V[(this.opcode & 0x00F0) >>4 ];
				this.V[15] = 0;
			}
			break;
			
		case 0x0005: //8XY5: VY is subtracted from VX. VF is set to 0 when there's a borrow, and 1 when there isn't.
			if(this.V[(this.opcode & 0x0F00) >>8 ] - this.V[(this.opcode & 0x00F0) >>4 ] < 0){
				this.V[(this.opcode & 0x0F00) >>8 ] = (this.V[(this.opcode & 0x0F00) >>8 ] - this.V[(this.opcode & 0x00F0) >>4 ]) + 256 ; //wrap around if more the 0xFF
				this.V[15] = 0;
			}
			else{
				this.V[(this.opcode & 0x0F00) >>8 ] -= this.V[(this.opcode & 0x00F0) >>4 ];
				this.V[15] = 1;
			}
			break;
			
		case 0x0006: //8XY6: Shifts VX right by one. VF is set to the value of the least significant bit of VX before the shift.
			this.V[0xF] = this.V[(this.opcode & 0x0F00) >>8 ] & 1;
			this.V[(this.opcode & 0x0F00) >>8 ] >>= 1;
			break;
			
		case 0x0007: //8XY7: Sets VX to VY minus VX. VF is set to 0 when there's a borrow, and 1 when there isn't.
			if(this.V[(this.opcode & 0x00F0) >>4 ] - this.V[(this.opcode & 0x0F00) >>8 ] < 0){
				this.V[(this.opcode & 0x0F00) >>8 ] = (this.V[(this.opcode & 0x00F0) >>4 ] - this.V[(this.opcode & 0x0F00) >>8 ]) + 256 ; //wrap around if more the 0xFF
				this.V[15] = 0;
			}
			else{
				this.V[(this.opcode & 0x0F00) >>8 ] = this.V[(this.opcode & 0x00F0) >>4 ] - this.V[(this.opcode & 0x0F00) >>8 ];
				this.V[15] = 1;
			}
			break;
			
		case 0x000E: //8XYE: Shifts VX left by one. VF is set to the value of the most significant bit of VX before the shift.
			this.V[15] = this.V[(this.opcode & 0x0F00) >>8 ] >> 7;
			this.V[(this.opcode & 0x0F00) >>8 ] = (this.V[(this.opcode & 0x0F00) >>8 ] << 1) & 0xFF;
			break;
 
		default:
			alert('opcode not found!: ' + this.opcode);       
		}
		break;
		
	case 0x9000://9XY0:	Skips the next instruction if VX doesn't equal VY.
		if(this.V[(this.opcode & 0x0F00) >>8 ] != this.V[(this.opcode & 0x00F0) >>4 ]){
			this.pc+=2;
		}
		break;
		
	case 0xA000://ANNN: Sets I to the address NNN.
		this.I = this.opcode & 0x0FFF;
		break;
	
	case 0xB000://BNNN:	Jumps to the address NNN plus V0.
		this.pc = (this.opcode & 0x0FFF) + this.V[0];
		break;
		
	case 0xC000://CXNN:	Sets VX to a random number and NN.
		this.V[(this.opcode & 0x0F00) >>8 ] = Math.floor(Math.random() * (255 - 0 + 1)) + 0;
		this.V[(this.opcode & 0x0F00) >>8 ] = this.V[(this.opcode & 0x0F00) >>8 ] & (this.opcode & 0x00FF);
		this.V[(this.opcode & 0x0F00) >>8 ] = this.V[(this.opcode & 0x0F00) >>8 ]  & 0xFF;
		break;
	
	case 0xD000://DXYN: Draws a sprite at coordinate (VX, VY) that has a width of 8 pixels and a height of N pixels. Each row of 8 pixels is read as bit-coded (with the most significant bit of each byte displayed on the left) starting from memory location I; I value doesn't change after the execution of this instruction. As described above, VF is set to 1 if any screen pixels are flipped from set to unset when the sprite is drawn, and to 0 if that doesn't happen.
		var x = this.V[(this.opcode & 0x0F00) >> 8];
		var y = this.V[(this.opcode & 0x00F0) >> 4];
		var height = this.opcode & 0x000F;
		var pixel;
		
		this.V[0xF] = 0;
		for (var yline = 0; yline < height; yline++)
		{
			pixel = this.memory[this.I + yline];
			for(var xline = 0; xline < 8; xline++)
			{
			if((pixel & (0x80 >> xline)) != 0)
			{
			if(this.screen[(x + xline + ((y + yline) * 64))] == 1)
				this.V[0xF] = 1;                                 
				this.screen[x + xline + ((y + yline) * 64)] ^= 1;
			}
			}
		}
		
		break;	
	
	case 0xE000:
                 switch (this.opcode & 0x00FF) {

                     // SKP Vx
                     // Ex9E
                     // Skip next instruction if the key with the value Vx is pressed.
                     case 0x009E:
                         if (this.key[this.V[(this.opcode & 0x0F00) >> 8]]) {
                             this.pc += 2;
                         }
                         break;

                     // SKNP Vx
                     // ExA1
                     // Skip  next instruction if the key with the value Vx is NOT pressed.
                     case 0x00A1:
                         if (!this.key[this.V[(this.opcode & 0x0F00) >> 8]]) {
                             this.pc += 2;
                         }
                         break;

                 }

                 break;
		
	case 0xF000:
		switch(this.opcode & 0x00FF)
		{
		case 0x0007: //FX07: Sets VX to the value of the delay timer. 
			this.V[(this.opcode & 0x0F00) >>8 ] = this.delay_timer;	
			break;
			
		case 0x000A: //FX0A: A key press is awaited, and then stored in VX.
			this.key_press_wait = true;
			this.VX_key_press_wait = (this.opcode & 0x0F00) >>8;
			break;
		
		case 0x0015: //FX15: Sets the delay timer to VX.  
			this.delay_timer = this.V[(this.opcode & 0x0F00) >>8 ];	
			break;
			
		case 0x0018: //FX18: Sets the sound timer to VX.    
			this.sound_timer = this.V[(this.opcode & 0x0F00) >>8 ];	
			break;
			
		case 0x001E: //FX1E: Adds VX to I.VF is set to 1 when range overflow (I+VX>0xFFF), and 0 when there isn't.
			if( (this.V[(this.opcode & 0x0F00) >>8 ] + this.I) > 0xFFF){
				this.I = (this.V[(this.opcode & 0x0F00) >>8 ] + this.I) - 0xFFF ; //wrap around if more the 0xFFF
				this.V[15] = 1;
			}
			else{
				this.I = this.V[(this.opcode & 0x0F00) >>8 ] + this.I;
				this.V[15] = 0;
			}
			break;
			
		case 0x0029: //FX29: Sets I to the location of the sprite for the character in VX. Characters 0-F (in hexadecimal) are represented by a 4x5 font. STILL NOT DONE! (not working)
			this.I = (this.V[(this.opcode & 0x0F00) >>8 ]*5);  
			break;
			
		case 0x0033: //FX33: Stores the Binary-coded decimal representation of VX, with the most significant of three digits at the address in I, the middle digit at I plus 1, and the least significant digit at I plus 2. (In other words, take the decimal representation of VX, place the hundreds digit in memory at location in I, the tens digit at location I+1, and the ones digit at location I+2.)   
			this.memory[this.I]     = this.V[(this.opcode & 0x0F00) >> 8] / 100;
			this.memory[this.I + 1] = (this.V[(this.opcode & 0x0F00) >> 8] / 10) % 10;
			this.memory[this.I + 2] = (this.V[(this.opcode & 0x0F00) >> 8] % 100) % 10;
			break;
			
		case 0x0055: //FX55: Stores V0 to VX in memory starting at address I
			for (var c=0; c <= ((this.opcode & 0x0F00) >>8);c++)
				this.memory[c+this.I]=this.V[c];
			
			this.I += ((this.opcode & 0x0F00) >> 8) + 1;
			
			break;
			
		case 0x0065: //FX65: Fills V0 to VX with values from memory starting at address I    
			for (var c=0; c <= ((this.opcode & 0x0F00) >>8);c++)
				this.V[c] = this.memory[c+this.I];
				
			this.I += ((this.opcode & 0x0F00) >> 8) + 1;
			break;
 
		default:
			alert('opcode not found!: ' + this.opcode);       
		}
		break;
		
		
	default:
		alert('opcode not found!: ' + this.opcode);  
	
	}
	
	
	
}

chip_cpu.prototype.emulate_cycle = function(){

	// Fetch Opcode	from the memory (stored as two decimal bytes (0-255))
	this.opcode =  this.memory[this.pc] << 8 | this.memory[this.pc+1];//now we have the opcode, stored like two byte hex
	
	// Decode Opcode and execute it
	this.decode_n_execute_opcode();
 
	// Update timers
	if(this.delay_timer>0)
		this.delay_timer--;
	if(this.sund_timer>0){
		this.sound_timer--;
		//play buzz sound
		document.getElementById('background_audio').muted = false;
		console.log('sound on!');
		
	}
	else
		document.getElementById('background_audio').muted = true;
}
