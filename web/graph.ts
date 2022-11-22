import {SingleTouchListener, isTouchSupported, MultiTouchListener, KeyboardHandler, TouchMoveEvent} from './io.js'
import {getHeight, getWidth, RGB, Sprite, GuiCheckList, GuiButton, SimpleGridLayoutManager, GuiLabel, GuiListItem, GuiSlider, SlideEvent, GuiCheckBox} from './gui.js'
import {random, srand, max_32_bit_signed, round_with_precision, saveBlob, FixedSizeQueue, Queue, PriorityQueue} from './utils.js'
import {menu_font_size, SquareAABBCollidable } from './game_utils.js'
window.sin = Math.sin;
window.cos = Math.cos;
window.tan = Math.tan;
window.asin = Math.asin;
window.acos = Math.acos;
window.atan = Math.atan;
window.log = Math.log;
window.pow = Math.pow;
window.sqrt = Math.sqrt;
class LayerManagerTool {
    list:GuiCheckList;
    layoutManager:SimpleGridLayoutManager;
    buttonAddLayer:GuiButton;
    runningId:number;
    static running_number:number = 0;
    layersLimit:number;
    callback_layer_count:() => number;
    callback_swap_layers:(l1:number, l2:number) => void;
    callback_slide_event:(layer:number, slider_value:number) => number;
    callback_add_layer:() => void;
    callback_delete_layer:(layer:number) => void;
    callback_checkbox_event:(layer:number, state:boolean) => void;
    callback_onclick_event:(layer:number) => void;
    callback_get_error_parallel_array:(layer:number) => string | null;
    callback_get_non_error_background_color:(layer:number) => RGB | null;

    constructor(limit:number = 16, callback_add_layer:() => void, 
    callback_checkbox_event:(layer:number, state:boolean) => void,
    callback_delete_layer:(layer:number) => void,
    callback_layer_count:() => number,
    callback_onclick_event:(layer:number) => void,
    callback_slide_event:(layer:number, slider_value:number) => number,
    callback_swap_layers:(l1:number, l2:number) => void,
    callback_get_error_parallel_array:(layer:number) => string | null,
    callback_get_non_error_background_color:(layer:number) => RGB | null)
    {
        this.callback_add_layer = callback_add_layer;
        this.callback_checkbox_event = callback_checkbox_event;
        this.callback_delete_layer = callback_delete_layer;
        this.callback_layer_count = callback_layer_count;
        this.callback_onclick_event = callback_onclick_event;
        this.callback_slide_event = callback_slide_event;
        this.callback_swap_layers = callback_swap_layers;
        this.callback_get_error_parallel_array = callback_get_error_parallel_array;
        this.callback_get_non_error_background_color = callback_get_non_error_background_color;
        this.layersLimit = limit;
        this.layoutManager = new SimpleGridLayoutManager([100, 24], [200, getHeight() - 130]);
        this.list = new GuiCheckList([1, this.layersLimit], [this.layoutManager.width(), getHeight() - 280], 20, false, this.callback_swap_layers,
        (event:SlideEvent) => {
            const index:number = this.list.list.findIndex(element => element.slider === event.element);
            this.callback_slide_event(index, event.value);
        }, callback_get_error_parallel_array, callback_get_non_error_background_color);
        this.buttonAddLayer = new GuiButton(() => { this.pushList(`x*x*${this.runningId++}`); this.callback_onclick_event(0) }, "Add Function", this.layoutManager.width() / 2, 75, 16);
        this.layoutManager.addElement(new GuiLabel("Functions list:", this.layoutManager.width()));
        this.layoutManager.addElement(this.list);
        this.layoutManager.addElement(this.buttonAddLayer);
        this.layoutManager.addElement(new GuiButton(() => this.deleteItem(), "Delete", this.layoutManager.width() / 2, 75, 16));
    
        this.runningId = 2;
        this.pushList(`sin(x*x)`);
        this.list.refresh();
    }
    deleteItem(index:number = this.list.selected()):void
    {
        if(this.list.list.length > 1 && this.list.list[index]){
            this.list.delete(index);
            this.callback_delete_layer(index);
        }
    }
    pushList(text:string): void {
        if(this.list.list.length < this.layersLimit)
        {
            if(this.callback_layer_count() < this.list.list.length)
            {
                this.callback_add_layer();
            }
            if(this.callback_layer_count() !== this.list.list.length)
                console.log("Error field layers out of sync with layers tool");
            
            this.list.push(text, true, (e) => {
                    const index:number = this.list.findBasedOnCheckbox(e.checkBox);
                    this.callback_checkbox_event(index, e.checkBox.checked);
                },
                (e) => {
                    this.list.list.forEach(el => el.textBox.deactivate());
                    if(this.list.selectedItem() && this.list.selectedItem()!.checkBox.checked)
                        this.list.selectedItem()!.textBox.activate();
                    this.callback_onclick_event(this.list.selected());
                });
                this.list.refresh();
        }
    }
    activateOptionPanel():void { this.layoutManager.activate(); }
    deactivateOptionPanel():void { this.layoutManager.deactivate(); }
    getOptionPanel():SimpleGridLayoutManager | null {
        return this.layoutManager;
    }
    optionPanelSize():number[]
    {
        return [this.layoutManager.canvas.width, this.layoutManager.canvas.height];
    }
    drawOptionPanel(ctx:CanvasRenderingContext2D, x:number, y:number):void
    {
        const optionPanel:SimpleGridLayoutManager = this.getOptionPanel()!;
        optionPanel.x = x;
        optionPanel.y = y;
        optionPanel.draw(ctx, x, y);
    }
};
class Function {
    source:string;
    color:RGB;
    compiled:(x:number) => number;
    error_message:string | null;
    x_min:number;
    x_max:number;
    dx:number;
    table:number[];
    constructor(source:string)
    {
        this.source = source;
        this.error_message = null;
        try{
            this.compiled = eval(`(x) => ${source}`);
        }catch(e:any)
        {
            console.log(e.message);
            this.error_message = e.message;
        }
        this.table = [];
        this.x_max = 0;
        this.x_min = 0;
        this.dx = 0;
        this.color = new RGB(0,0,0,0);
    }
    compile(source:string):void
    {
        if(this.source !== source)
        {
            this.source = source;
            this.error_message = null;
            try{
                this.compiled = eval(`(x) => ${source}`);
            }catch(e:any)
            {
                console.log(e.message);
                this.error_message = e.message;
            }
            this.x_max = 0;
            this.x_min = 0;
            this.dx = 0;
        }
    }
    calc_for(x_min:number, x_max:number, dx:number):number[]
    {
        if(this.error_message === null)
        {
            this.x_max = x_max;
            this.x_min = x_min;
            this.dx = dx;
            this.table.splice(0, this.table.length);
            try {
                for(let i = x_min; i <= x_max; i += dx)
                {
                    this.table.push(this.compiled(i));
                }
            } catch (error:any)
            {
                console.log(error.message);
                this.error_message = error.message;
            }
        }
        return this.table;
    }
    call(x:number):number | null
    {
        if(this.error_message === null)
        {
            try {
                return this.compiled(x);
            } catch (error:any)
            {
                console.log(error.message);
                this.error_message = error.message;
            }
        }
        return null;
    }
};
class Game extends SquareAABBCollidable {
    repaint:boolean;
    axises:Sprite;
    draw_point_labels:boolean;
    draw_axises:boolean;
    draw_axis_labels:boolean;
    functions:Function[];
    main_buf:Sprite;
    background_color:RGB;
    guiManager:SimpleGridLayoutManager;
    options_gui_manager:SimpleGridLayoutManager;
    layer_manager:LayerManagerTool;
    touchListener:SingleTouchListener;
    scaling_multiplier:number;
    graph_start_x:number;
    cell_dim:number[];
    scale:number;
    y_translation:number;
    x_translation:number;

    x_min :number;
    x_max :number;
    deltaX:number;
    y_min :number;
    y_max :number;
    deltaY:number;
    constructor(touchListener:SingleTouchListener, x:number, y:number, width:number, height:number)
    {
        super(x, y, width, height);
        this.scaling_multiplier = 1;
        this.repaint = true;
        this.touchListener = touchListener
        this.functions = [];
        this.draw_axises = true;
        this.draw_axis_labels = true;
        this.draw_point_labels = true;
        this.x_min = this.x_translation * this.scale - 1/this.scale;
        this.x_max = this.x_translation * this.scale + 1/this.scale;
        this.deltaX = this.x_max - this.x_min;
        this.y_min = this.y_translation * this.scale - this.deltaX / 2;
        this.y_max = this.y_translation * this.scale + this.deltaX / 2;
        this.deltaY = this.y_max - this.y_min;
        this.scale = 1/10;
        this.x_translation = 0;
        this.y_translation = 0;
        this.graph_start_x = 200;
        const whratio = width / (height > 0 ? height : width);
        const rough_dim = getWidth();
        this.background_color = new RGB(0, 0, 0, 0);
        this.cell_dim = [getWidth(), getHeight() - 50];
        this.init(this.cell_dim[0], this.cell_dim[1], this.cell_dim[0], this.cell_dim[1]);
        this.guiManager = new SimpleGridLayoutManager([1,1000], [this.graph_start_x, getHeight()], 0, 30);
        this.layer_manager = this.new_layer_manager();
        this.axises = this.new_sprite();
        this.main_buf = this.new_sprite();
        this.guiManager.addElement(this.layer_manager.layoutManager);
        this.guiManager.addElement(new GuiSlider(0, [this.guiManager.width(), 50], (e:SlideEvent) => {
            this.scaling_multiplier = e.value * 4 + 1;
        }));
        this.guiManager.activate();
        const touch_mod = isTouchSupported() ? 38 : 0;
        this.options_gui_manager = new SimpleGridLayoutManager([2, 40], [200, 140 + touch_mod * 2.1], this.guiManager.x + this.guiManager.width(), this.guiManager.y);
        this.options_gui_manager.addElement(new GuiLabel("Show axises", 100));
        this.options_gui_manager.addElement(new GuiLabel("Show labels", 100));
        this.options_gui_manager.addElement(new GuiCheckBox((event:any) => {
            this.draw_axises = event.checkBox.checked;
            this.repaint = true;
        }, 50 + touch_mod, 50 + touch_mod, this.draw_axis_labels));
        this.options_gui_manager.addElement(new GuiCheckBox((event:any) => {
            this.draw_axis_labels = event.checkBox.checked
            this.repaint = true;
        }, 50 + touch_mod, 50 + touch_mod, this.draw_axis_labels));
        const show_label = new GuiLabel("Show point", 100, 18, 50 + touch_mod);
        this.options_gui_manager.addElement(show_label);
        this.options_gui_manager.addElement(new GuiCheckBox((event:any) => {
            this.draw_point_labels = event.checkBox.checked;
        }, 50 + touch_mod, 50 + touch_mod, this.draw_axis_labels));

        this.options_gui_manager.activate();
        //this.restart_game();
        this.try_render_functions();
    }
    init(width:number, height:number, cell_width:number, cell_height:number):void
    {
        this.resize(width, height);

        this.background_color = new RGB(0, 0, 0, 0);
        this.cell_dim = [cell_width, cell_height];
        this.main_buf = this.new_sprite();
        this.axises = this.new_sprite();
        this.repaint = true;
    }
    new_layer_manager():LayerManagerTool
    {
        const layer_manager = new LayerManagerTool(10, () => { this.add_layer(); }, 
        (layer:number, state:boolean) => this.repaint = true,
        (layer:number) => {this.functions.splice(layer, 1); this.repaint = true},
        () => this.functions.length,
        (layer:number) => this.repaint = true,
        (layer:number, slider_value:number) => {console.log('layer', layer,'slider val', slider_value); return 0},
        (l1:number, l2:number) => {this.swap_layers(l1, l2); this.repaint = true;},
        (layer:number) => this.functions[layer] ? this.functions[layer].error_message : null,
        (layer:number) => {
            return this.functions[layer]? this.functions[layer].color : null;
        }
        );
        if(this.layer_manager)
        {
            layer_manager.list.list = this.layer_manager.list.list;
        }
        return layer_manager;
    }
    calc_bounds():void
    {
        this.x_min = this.x_translation - 1/this.scale;
        this.x_max = this.x_translation + 1/this.scale;
        this.deltaX = this.x_max - this.x_min;
        this.y_min = this.y_translation - this.deltaX / 2;
        this.y_max = this.y_translation + this.deltaX / 2;
        this.deltaY = this.y_max - this.y_min;
    }
    add_layer():void
    {
        this.functions.push(new Function(""));
        this.repaint = true;
    }
    swap_layers(l1:number, l2:number):void
    {
        const temp = this.functions.splice(l1, 1)[0];
        this.functions.splice(l2, 0, temp);
    }
    set_place(index:number, color:number):boolean
    {
        const view = new Int32Array(this.main_buf.imageData!.data.buffer);
        if(view[index] !== undefined)
        {
            view[index] = color;
            return true;
        }
        return false;
    }
    get_place(index:number):number | null
    {
        const view = new Int32Array(this.main_buf.imageData!.data.buffer);
        if(view[index] !== undefined)
        {
            return view[index];
        }
        return null;
    }
    is_background(index:number):boolean
    {
        const view = new Int32Array(this.main_buf.imageData!.data.buffer);
        return this.get_place(index) == this.background_color.color;
    }
    clear_place(removed:number):boolean
    {
        const view = new Int32Array(this.main_buf.imageData!.data.buffer);
        if(view[removed] !== undefined)
        {
            view[removed] = this.background_color.color;
            return true;
        }
        return false;
    }
    restart_game():void
    {
        this.init(this.width, this.height, this.cell_dim[0], this.cell_dim[1]);
    }
    new_sprite():Sprite
    {   
        const pixels = (new Array<RGB>(this.cell_dim[1] * this.cell_dim[0])).fill(this.background_color, 0, this.cell_dim[1] * this.cell_dim[0]);
        return new Sprite(pixels, this.cell_dim[0], this.cell_dim[1], false);
    }
    
    resize(width:number, height:number):void
    {
        this.width = width;
        this.height = height;
        this.calc_bounds();
    }
    try_render_functions()
    {
        this.calc_bounds();
        let functions:Function[] = this.functions;
        //this.screen_buf = [];
        //this.main_buf.ctx.clearRect(0, 0, this.cell_dim[0], this.cell_dim[1]);
        this.layer_manager.list.list.forEach((li:GuiListItem, index:number) => {
            const text = li.textBox.text;
            if(!this.main_buf)
            {
                this.main_buf = (this.new_sprite());
            }
            if(!this.functions[index])
            {
                const color = new RGB(index * 30 % 256, (index+1) * 150 % 256, index * 85 % 256, 255);
                const foo = new Function(text);
                foo.color = color;
                functions.push(foo);
            }
            else
                functions[index].compile(text);
        });
        
        const view = new Int32Array(this.main_buf.imageData!.data.buffer);
        functions.forEach((foo:Function, index:number) => {
            if(this.layer_manager.list.list[index] && this.layer_manager.list.list[index].checkBox.checked)
            {
                //build table to be rendered
                foo.calc_for(this.x_min, this.x_max, (this.x_max - this.x_min) / this.cell_dim[0] / 3);

                //render table to main buffer
                let last_x = 0;
                let last_y = ((-foo.table[0] - this.y_min) / this.deltaY) * this.cell_dim[1];
                
                this.main_buf.ctx.beginPath();
                this.main_buf.ctx.strokeStyle = foo.color.htmlRBG();
                this.main_buf.ctx.lineWidth = 2;
                for(let i = 0; i < foo.table.length; i++)
                {
                    const x = this.x_min + foo.dx * i;
                    const y = -foo.table[i];
                    const sy = ((y - this.y_min) / this.deltaY) * this.cell_dim[1];
                    const sx = ((x - this.x_min) / this.deltaX) * this.cell_dim[0];
                    //render to buffers
                    if(sx !== last_x || sy !== last_y)
                    {
                        this.main_buf.ctx.moveTo(last_x, last_y)
                        this.main_buf.ctx.lineTo(sx, sy);
                    }
                    last_x = sx;
                    last_y = sy;
                }
                this.main_buf.ctx.stroke();
            }
        });
        this.main_buf.ctx.beginPath();
        this.main_buf.ctx.stroke();
    }
    render_axises(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number):void
    {
        if(this.draw_axises)
        {
            const font_size = 20;
            const screen_space_x_axis = -this.y_min >= 0 && -this.y_max <= 0 ? (0 - this.y_min) / this.deltaY * this.cell_dim[1] :  -this.y_min < 0 ? 0 : this.main_buf.height;
            let screen_space_y_axis = -this.x_min >= 0 && -this.x_max <= 0 ? (0 - this.x_min) / this.deltaX * this.cell_dim[0] : -this.x_min < 0 ? 0 : this.main_buf.width;
            
            this.axises.ctx.clearRect(0, 0, this.cell_dim[0], this.cell_dim[1]);
    
            this.axises.ctx.beginPath();
            this.axises.ctx.lineWidth = 4;
            this.axises.ctx.strokeStyle = "#FFFFFF";
            this.axises.ctx.moveTo(0, screen_space_x_axis);
            this.axises.ctx.lineTo(this.cell_dim[0], screen_space_x_axis);
            this.axises.ctx.moveTo(screen_space_y_axis, 0);
            this.axises.ctx.lineTo(screen_space_y_axis, this.cell_dim[1]);
            this.axises.ctx.stroke();
            this.axises.ctx.beginPath();
            this.axises.ctx.lineWidth = 3;
            this.axises.ctx.strokeStyle = "#000000";
            this.axises.ctx.moveTo(0, screen_space_x_axis);
            this.axises.ctx.lineTo(this.cell_dim[0], screen_space_x_axis);
            this.axises.ctx.moveTo(screen_space_y_axis, 0);
            this.axises.ctx.lineTo(screen_space_y_axis, this.cell_dim[1]);
            ctx.stroke();
            if(this.draw_axis_labels)
            {
                const msd_x = Math.pow(10, Math.floor(-Math.log10(this.deltaX)));
                const delta_x = Math.floor(this.deltaX * msd_x * 10) / (msd_x * 100);
                let closest_start_x = Math.ceil(this.x_min * msd_x * 100) / (msd_x*100);
                closest_start_x -= closest_start_x % delta_x;
                const msd_y = Math.pow(10, Math.ceil(-Math.log10(this.deltaY)));
                const delta_y = Math.floor(this.deltaY * msd_y * 10) / (msd_y * 100);
                let closest_start_y = Math.ceil(this.y_min * msd_y * 10) / (msd_y*10);
                closest_start_y -= closest_start_y % delta_y;
    
                let i = closest_start_x;
                let last_render_x:number = -1;
                let last_render_text_width = 0;
                ctx.font = `${font_size}px Helvetica`;
                ctx.strokeStyle = "#FFFFFF";
                ctx.lineWidth = 3;
                while(i < this.x_max)
                {
                    const screen_x = ((i - this.x_min) / this.deltaX) * this.main_buf.width;
                    if(screen_x > last_render_x + last_render_text_width + 10 && Math.abs(i) >= delta_x*15/16)
                    {
                        last_render_x = screen_x + 3;
                        const text = this.format_number(i);
                        const text_width = ctx.measureText(text).width;
                        last_render_text_width = text_width;

                        ctx.strokeRect(screen_x - 3, screen_space_x_axis - 3, 6, 6);
                        ctx.fillRect(screen_x - 3, screen_space_x_axis - 3, 6, 6);
                        let text_y = screen_space_x_axis;
                        if(text_y - font_size < 0)
                        {
                            text_y += font_size + 10;
                        }
                        ctx.strokeText(text, screen_x + 3, text_y - 6);
                        ctx.fillText(text, screen_x + 3, text_y - 6);
                    }
                    
                    i += delta_x;
                }
                i = closest_start_y;
                let last_render_y = -font_size;
                const old_screen_space_y_axis = screen_space_y_axis;
                while(i <= this.y_max)
                {
                    const screen_y = (i - this.y_min) / this.deltaY * this.main_buf.height;
                    screen_space_y_axis = old_screen_space_y_axis;
                    if(screen_y > last_render_y + font_size*2)
                    {
                        last_render_y = screen_y;
                        const text = Math.abs(i) >= delta_y / 16 ? this.format_number(-i) : 0 +"";
                        const text_width = ctx.measureText(text).width;
                        if(screen_space_y_axis + text_width > this.main_buf.width)
                        {
                            screen_space_y_axis -= text_width + 10;
                        }
                        ctx.strokeText(text, screen_space_y_axis + 3, screen_y - 4);
                        ctx.fillText(text, screen_space_y_axis + 3, screen_y - 4);
                        ctx.strokeRect(old_screen_space_y_axis - 3, screen_y - 3, 6, 6);
                        ctx.fillRect(old_screen_space_y_axis - 3, screen_y - 3, 6, 6);
                    }
                    i += delta_y;
                }
            }

            this.axises.ctx.stroke();
    
            ctx.drawImage(this.axises.image, x, y, width, height);
        }
    }
    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void 
    {
        if(this.repaint)
        {
            this.main_buf.ctx.imageSmoothingEnabled = false;
            this.main_buf.ctx.clearRect(0, 0, this.main_buf.width, this.main_buf.height);
            this.repaint = false;
            this.try_render_functions();
            const font_size = 24;
            if(+ctx.font.split("px")[0] != font_size)
            {
                ctx.font = `${font_size}px Helvetica`;
            }
            this.render_axises(this.main_buf.image, this.main_buf.ctx, x, y, this.main_buf.width, this.main_buf.height);
            
        }
        ctx.drawImage(this.main_buf.image, x, y);
        if(this.touchListener.touchPos[0] < this.options_gui_manager.x + this.options_gui_manager.width())
        {
            this.guiManager.draw(ctx);
            this.layer_manager.list.pos[0] = this.guiManager.x;
            this.layer_manager.list.pos[1] = this.guiManager.y;
            this.options_gui_manager.draw(ctx);
        }
        const touchPos = this.touchListener.touchPos;
        if(this.draw_point_labels)
        {
            if(!isTouchSupported())
                this.render_x_y_label_screen_space(ctx, touchPos);
            const selected_function = this.functions[this.layer_manager.list.selected()];
            if(selected_function && this.layer_manager.list.selectedItem()?.checkBox.checked)
            {
                try{
                    const nearest_x = (touchPos[0] / this.width * this.deltaX) + selected_function.x_min;
                    const world_y = selected_function.compiled(nearest_x);
                    const world_x = nearest_x;
                    this.render_x_y_label_world_space(ctx, world_x, world_y);
                }
                catch(error:any){}
            }
        }
    }
    auto_round_world_x(x:number):number
    {
        const logarithm = Math.log10(Math.abs(x));
        const rounded = Math.round(x * (Math.pow(1, -logarithm) * 100)) * Math.floor(Math.pow(1, logarithm)) / 100;
        return rounded;
    }
    round(value:number, places:number):number
    {
        return +(""+Math.round(value * Math.pow(10, places)) * Math.pow(10, -places)).substring(0, places + 1);
    }
    render_x_y_label_screen_space(ctx:CanvasRenderingContext2D, touchPos:number[], precision:number = 2):void
    {
        const world_x = ((touchPos[0] / this.width) * this.deltaX + this.x_min);
        const world_y = ((touchPos[1] / this.height) * this.deltaY + this.y_min);
        this.render_formatted_point(ctx, world_x, -world_y, touchPos[0], touchPos[1], precision);
    }
    render_x_y_label_world_space(ctx:CanvasRenderingContext2D, world_x:number, world_y:number, precision:number = 1):void
    {
        const screen_x = ((world_x - this.x_min) / this.deltaX) * this.width;
        const screen_y = ((-world_y - this.y_min) / this.deltaY) * this.height;
        this.render_formatted_point(ctx, world_x, world_y, screen_x, screen_y, precision);
    }
    render_formatted_point(ctx:CanvasRenderingContext2D, world_x:number, world_y:number, screen_x:number, screen_y:number, precision:number = 2):void
    {
        const dim = 10;
        ctx.fillRect(screen_x - dim / 2, screen_y - dim / 2, dim, dim);
        ctx.strokeRect(screen_x - dim / 2, screen_y - dim / 2, dim, dim);
        let text:string;
        if(Math.abs(world_x) < 1 << 16 && Math.abs(world_x) > 0.000001)
        {
            text = `x: ${round_with_precision(world_x, precision + 2)} y: ${round_with_precision(world_y, precision + 2)}`;

        }
        else
        {
            text = `x: ${world_x.toExponential(precision)} y: ${world_y.toExponential(precision)}`;
        }            
        const text_width = ctx.measureText(text).width;            
        if(text_width + screen_x + dim > this.width)
        {
            screen_x -= text_width + dim * 2;
            screen_y += 3;
        }
        ctx.fillText(text, screen_x + dim, screen_y + dim / 2);
        ctx.strokeText(text, screen_x + dim, screen_y + dim / 2);
    }
    format_number(value:number, precision:number = 2):string
    {
        const dim = 10;
        let text:string;
        if(Math.abs(value) < 1 << 16 && Math.abs(value) > 0.0001)
        {
            text = `${round_with_precision(value, precision + 2)}`;
        }
        else
        {
            text = `${value.toExponential(precision)}`;
        }            
        return text;
    }
    cell_dist(cell1:number, cell2:number):number
    {
        const c1x = cell1 % this.cell_dim[0];
        const c1y = Math.floor(cell1 / this.cell_dim[0]);
        const c2x = cell2 % this.cell_dim[0];
        const c2y = Math.floor(cell2 / this.cell_dim[0]);
        //return (Math.abs(c1x - c2x) + Math.abs(c1y - c2y));
        return Math.sqrt(Math.pow(c1x - c2x, 2) + Math.pow(c1y - c2y, 2));
    }
    column(cell):number
    {
        return cell % this.cell_dim[0];
    }
    row(cell):number
    {
        return Math.floor(cell / this.cell_dim[0]);
    }
    screen_to_index(x:number, y:number):number
    {
        const x_scale = 1 / this.width * this.cell_dim[0];
        const y_scale = 1 / this.height * this.cell_dim[1];
        x *= x_scale;
        y *= y_scale;
        return Math.floor(x) + Math.floor(y) * this.cell_dim[0];
    }
    fill(start:number, color_p:number):void
    {
        this.traverse_df(start, 
            (index, color) => color_p, 
                (index, color) => color == this.background_color.color);
    }
    traverse_df(start:number, apply:(index:number, color:number) => number, verifier:(index:number, color:number) => boolean):void
    {
        const view:Int32Array = new Int32Array(this.main_buf.imageData!.data.buffer);
        const checked_map:Int32Array = new Int32Array(view.length);
        checked_map.fill(0, 0, checked_map.length);
        const stack:number[] = [];
        stack.push(start);
        while(stack.length > 0)
        {
            const current = stack.pop()!;
            if(!checked_map[current] && verifier(current, view[current]))
            {
                checked_map[current] = 1;
                view[current] = apply(current, view[current]);
                
                if(checked_map[current + 1] === 0  && this.row(current + 1) === this.row(current) && view[current + 1] !== undefined)
                {
                    stack.push(current + 1);
                }
                if(checked_map[current - 1] === 0  && this.row(current - 1) === this.row(current) && view[current - 1] !== undefined)
                {
                    stack.push(current - 1);
                }
                if(checked_map[current + this.cell_dim[0]] === 0 && this.column(current + this.cell_dim[0]) === this.column(current) && view[current + this.cell_dim[0]] !== undefined)
                {
                    stack.push(current + this.cell_dim[0]);
                }
                if(checked_map[current - this.cell_dim[0]] === 0 && this.column(current - this.cell_dim[0]) === this.column(current) && view[current - this.cell_dim[0]] !== undefined)
                {
                    stack.push(current - this.cell_dim[0]);
                }
            }
        }
    }
    update_state(delta_time: number): void 
    {
    }
};
const keyboardHandler = new KeyboardHandler();
async function main()
{
    const canvas:HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("screen");
    const touchListener = new SingleTouchListener(canvas, true, true, false);


    canvas.onmousemove = (event:MouseEvent) => {
    };
    const power_of_2_bounds = 300;
    canvas.addEventListener("wheel", (e) => {
        //e.preventDefault();
        const normalized_delta = e.deltaY / getHeight();
        const multiplier = 100;
        const scaler = game.scale / 100;
        game.scale -= normalized_delta * multiplier * scaler;
        if(Math.abs(game.scale) > Math.pow(2, power_of_2_bounds))
            game.scale = Math.pow(2, power_of_2_bounds) * (game.scale < 0 ? -1 : 1);
        else if(Math.abs(game.scale) < Math.pow(2, -power_of_2_bounds))
            game.scale = Math.pow(2, -power_of_2_bounds) * (game.scale < 0 ? -1 : 1);
        game.repaint = true;
        e.preventDefault();
    });
    canvas.width = getWidth();
    canvas.height = getHeight();
    canvas.style.cursor = "pointer";
    let counter = 0;
    const touchScreen:boolean = isTouchSupported();
    const multi_touch_listener = new MultiTouchListener(canvas);
    multi_touch_listener.registerCallBack("pinchIn", () => true, (event:any) => {
        const normalized_delta = event.delta / Math.max(getHeight(), getWidth());
        const scaler = game.scale / 10;
        game.scale += scaler * Math.abs(normalized_delta) * 100;
        if(Math.abs(game.scale) > Math.pow(2, power_of_2_bounds))
            game.scale = Math.pow(2, power_of_2_bounds) * (game.scale < 0 ? -1 : 1);
        game.repaint = true;
        event.preventDefault();
    });
    multi_touch_listener.registerCallBack("pinchOut", () => true, (event:any) => {
        const normalized_delta = event.delta / Math.max(getHeight(), getWidth());
        const scaler = game.scale / 10;
        game.scale -= scaler * Math.abs(normalized_delta) * 100;
        if(Math.abs(game.scale) < Math.pow(2, -power_of_2_bounds))
            game.scale = Math.pow(2, -power_of_2_bounds) * (game.scale < 0 ? -1 : 1);
        game.repaint = true;
        event.preventDefault();
    });
    let height = getHeight();
    let width = getWidth();
    let game = new Game(touchListener, 0, 0, height, width);
    window.game = game;
    let low_fps:boolean = true;
    let draw = false;
    game.guiManager.createHandlers(keyboardHandler, touchListener);
    game.options_gui_manager.createHandlers(keyboardHandler, touchListener);
    /*touchListener.registerCallBack("touchstart", (event:any) => true, (event:TouchMoveEvent) => {
    });
    touchListener.registerCallBack("touchend", (event:any) => true, (event:TouchMoveEvent) => {
    });*/
    touchListener.registerCallBack("touchmove", (event:any) => true, (event:TouchMoveEvent) => {
        let scaler_x = game.deltaX / (game.width);
        let scaler_y = game.deltaY / (game.height);
            
        game.y_translation -= game.scaling_multiplier * scaler_y * (event.deltaY);
        game.x_translation -= game.scaling_multiplier * scaler_x * (event.deltaX);
        
        game.repaint = true;
    });
    keyboardHandler.registerCallBack("keydown", () => true, (event:any) => {
        if(!keyboardHandler.keysHeld["MetaLeft"] && !keyboardHandler.keysHeld["ControlLeft"] &&
            !keyboardHandler.keysHeld["MetaRight"] && !keyboardHandler.keysHeld["ControlRight"])
            event.preventDefault();
        
        game.repaint = true;
        let scaler_x = game.deltaX / (game.width);
        let scaler_y = game.deltaY / (game.height);
        switch(event.code)
        {
            case("ArrowUp"):
            game.y_translation -= scaler_y;
            break;
            case("ArrowDown"):
            game.y_translation += scaler_y;
            break;
            case("ArrowLeft"):
            game.x_translation -= scaler_x;
            break;
            case("ArrowRight"):
            game.x_translation += scaler_x;
            break;
        }
    });
    let maybectx:CanvasRenderingContext2D | null = canvas.getContext("2d");
    if(!maybectx)
        return;
    const ctx:CanvasRenderingContext2D = maybectx;
    let start = Date.now();
    let dt = 1;
    const ostart = Date.now();
    let frame_count = 0;
    let instantaneous_fps = 0;
    const time_queue:FixedSizeQueue<number> = new FixedSizeQueue<number>(60 * 2);
    const header = document.getElementById("header");
    srand(Math.random() * max_32_bit_signed);

    const drawLoop = () => 
    {
        frame_count++;
        //do stuff and render here
        if(getWidth() !== width || getHeight() !== height)
        {
            width = getWidth();
            height = getHeight();

            canvas.width = width;
            canvas.height = height;
            game.init(width, height - 50, width, height - 50);
        }
        dt = Date.now() - start;
        time_queue.push(dt);
        start = Date.now();
        let sum = 0;
        let highest = 0;
        for(let i = 0; i < time_queue.length; i++)
        {
            const value = time_queue.get(i);
            sum += value;
            if(highest < value)
            {
                highest = value;
            }
        }
        game.update_state(dt);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        game.draw(canvas, ctx, game.x, game.y, game.width, game.height);
        if(frame_count % 10 === 0)
            instantaneous_fps = Math.floor(1000 / (low_fps?highest:dt));
        let text = "";
        ctx.fillStyle = "#FFFFFF";
        text = `avg fps: ${Math.floor(1000 * time_queue.length / sum)}, ${low_fps?"low":"ins"} fps: ${instantaneous_fps}`;
        const text_width = ctx.measureText(text).width;
        ctx.strokeText(text, game.width - text_width - 10, menu_font_size());
        ctx.fillText(text, game.width - text_width - 10, menu_font_size());

        requestAnimationFrame(drawLoop);
    }
    drawLoop();

}
main();





