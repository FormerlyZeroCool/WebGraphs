import {SingleTouchListener, isTouchSupported, MultiTouchListener, KeyboardHandler, TouchMoveEvent, MultiTouchEvent} from './io.js'
import {getHeight, getWidth, RGB, Sprite, GuiCheckList, GuiButton, SimpleGridLayoutManager, GuiLabel, GuiListItem, GuiSlider, SlideEvent, GuiCheckBox, 
    GuiColoredSpacer, ExtendedTool, vertical_group, horizontal_group, CustomBackgroundSlider, StateManagedUI, UIState, GuiSpacer, is_landscape, GuiElement, groupify, VerticalLayoutManager} from './gui.js'
import {sign, srand, clamp, max_32_bit_signed, round_with_precision, saveBlob, FixedSizeQueue, Queue, PriorityQueue, logToServer, sleep, DynamicFloat64Array} from './utils.js'
import {magnitude, menu_font_size, SpatialHashMap2D, SquareAABBCollidable } from './game_utils.js'
window.sec = (x:number) => 1/Math.sin(x);
window.csc = (x:number) => 1/Math.cos(x);
window.cotan = (x:number) => 1/Math.tan(x);
window.sin = Math.sin;
window.cos = Math.cos;
window.tan = Math.tan;
window.asin = Math.asin;
window.acos = Math.acos;
window.atan = Math.atan;
window.log = Math.log;
window.pow = Math.pow;
window.sqrt = Math.sqrt;
window.pi = Math.PI;
window.PI = Math.PI;
window.e = Math.E;
window.E = Math.E;
window.gv = window;
const derx = (foo:(x:number, dx:number) => number, x:number, dx:number) => {
    return (foo(x + dx, dx) - foo(x, dx)) / dx;
};
window.derx = derx;
const dderx =  (foo:(x:number, dx:number) => number, x:number, dx:number) => {
    return (derx(foo, x + dx, dx) - derx(foo, x, dx)) / dx;
};
window.dderx = dderx;

class ColorPickerTool extends ExtendedTool {
    chosenColor:GuiColoredSpacer;
    hueSlider:CustomBackgroundSlider;
    saturationSlider:CustomBackgroundSlider;
    lightnessSlider:CustomBackgroundSlider;
    buttonInvertColors:GuiButton;

    constructor(color_changed:(color:RGB) => void, toolName:string = "color picker", pathToImage:string[] = ["images/colorPickerSprite.png"], optionPanes:SimpleGridLayoutManager[] = [])
    {
        super(null, pathToImage, optionPanes, [200, 200], [4, 50]);
        this.chosenColor = new GuiColoredSpacer([100, 32], new RGB(0,150,150,255), () => document.body.style.backgroundColor = this.chosenColor.color.htmlRBG());
        const colorSlideEvent:(event:SlideEvent) => void = (event:SlideEvent) => {
            const color:RGB = new RGB(0, 0, 0, 0);
            color.setByHSL(this.hueSlider.state * 360, this.saturationSlider.state, this.lightnessSlider.state);
            color.setAlpha(255);
            this.color().copy(color);
            this._setColorText();
            color_changed(color);
            this.hueSlider.refresh();
            this.saturationSlider.refresh();
            this.lightnessSlider.refresh();
        };    
        const slider_height = 50;
        this.hueSlider = new CustomBackgroundSlider(0, [150, slider_height], colorSlideEvent, 
            (ctx:CanvasRenderingContext2D, x:number, y:number, width:number, height:number) => {
                const color:RGB = new RGB(0, 0, 0, 0);
                if(this.color())
                {
                    const hsl:number[] = [this.hueSlider.state * 360, this.saturationSlider.state, this.lightnessSlider.state];

                    const unitStep:number = 1 / width;
                    let i = 0;
                    for(let j = 0; j < 1; j += unitStep)
                    {
                        hsl[0] = j * 360;
                        color.setByHSL(hsl[0], hsl[1], hsl[2]);
                        color.setAlpha(this.color().alpha());
                        ctx.fillStyle = color.htmlRBGA();
                        ctx.fillRect(j * width + x, y, unitStep * width, height);
                    }
                }
        });
        this.saturationSlider = new CustomBackgroundSlider(1, [150, slider_height], colorSlideEvent, 
            (ctx:CanvasRenderingContext2D, x:number, y:number, width:number, height:number) => {
                const color:RGB = new RGB(0, 0, 0, 0);
                if(this.color())
                {
                    const hsl:number[] = [this.hueSlider.state * 360, this.saturationSlider.state, this.lightnessSlider.state];
                    
                    const unitStep:number = 1 / width;
                    let i = 0;
                    for(let j = 0; j < 1; j += unitStep)
                    {
                        color.setByHSL(hsl[0], j, hsl[2]);
                        color.setAlpha(this.color().alpha());
                        ctx.fillStyle = color.htmlRBGA();
                        ctx.fillRect(j * width + x, y, unitStep * width, height);
                    }
                }
        });
        this.lightnessSlider = new CustomBackgroundSlider(0, [150, slider_height], colorSlideEvent, 
            (ctx:CanvasRenderingContext2D, x:number, y:number, width:number, height:number) => {
                const color:RGB = new RGB(0, 0, 0, 0);
                if(this.color())
                {
                    const hsl:number[] = [this.hueSlider.state * 360, this.saturationSlider.state, this.lightnessSlider.state];
                    
                    const unitStep:number = 1 / width;
                    let i = 0;
                    for(let j = 0; j < 1; j += unitStep, i++)
                    {
                        hsl[2] = j;
                        color.setByHSL(hsl[0], hsl[1], hsl[2]);
                        color.setAlpha(this.color().alpha());
                        ctx.fillStyle = color.htmlRBGA();
                        ctx.fillRect(i + x, y, unitStep * width, height);
                    }
                }
        });
        this.localLayout.addElement(
            horizontal_group(
                [
                    new GuiButton(() => document.body.style.backgroundColor = "#4B4B4B", "Color:", 100, this.chosenColor.height(), 16),
                    this.chosenColor
                ])
            );

        this.localLayout.addElement(vertical_group(
            [
                horizontal_group(
                    [ 
                        new GuiLabel("Hue", 50, 16, slider_height), 
                        this.hueSlider
                    ]),
                horizontal_group(
                    [ 
                        new GuiLabel("Sat.", 50, 16, slider_height),
                        this.saturationSlider
                    ]),
                horizontal_group(
                    [ 
                        new GuiLabel("Light", 50, 16, slider_height),
                        this.lightnessSlider
                    ])
            ]));
        this.setColorText();
        this.hueSlider.refresh();
        this.saturationSlider.refresh();
        this.lightnessSlider.refresh();
        this.localLayout.trimDim();
        this.getOptionPanel()!.trimDim();
    }
    set_color(color:RGB):void
    {
        this.chosenColor.color.copy(color);
        const hsl = color.toHSL();
        this.hueSlider.setState(hsl[0] / 360);
        this.saturationSlider.setState(hsl[1]);
        this.lightnessSlider.setState(hsl[2]);
        this.hueSlider.refresh();
        this.saturationSlider.refresh();
        this.lightnessSlider.refresh();
        this.chosenColor.refresh();
    }
    color():RGB
    {
        return this.chosenColor.color;
    }
    setColorText():void
    {
        const color:RGB = this._setColorText();
        const hsl:number[] = color.toHSL();
        this.hueSlider.setState(hsl[0] / 360);
        this.saturationSlider.setState(hsl[1]);
        this.lightnessSlider.setState(hsl[2]);
    }
    _setColorText():RGB
    {
        const color:RGB = new RGB(0,0,0);
        if(this.color())
            color.copy(this.color());
        
        this.chosenColor.color.copy(color);
        return color;
    }
    activateOptionPanel():void { this.layoutManager.activate(); }
    deactivateOptionPanel():void { this.layoutManager.deactivate(); }
    getOptionPanel():SimpleGridLayoutManager | null {
        return this.layoutManager;
    }
    optionPanelSize():number[]
    {
        return [this.layoutManager.width(), this.layoutManager.height()];
    }
    drawOptionPanel(ctx:CanvasRenderingContext2D, x:number, y:number):void 
    {
        const optionPanel:SimpleGridLayoutManager = this.getOptionPanel()!;
        optionPanel.x = x;
        optionPanel.y = y;
        optionPanel.draw(ctx, x, y);
    }
};

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

    constructor(limit:number = 5, callback_add_layer:() => void, 
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
        this.layoutManager = new SimpleGridLayoutManager([100, 24], [200, 530 - 130]);
        this.list = new GuiCheckList([1, this.layersLimit], [this.layoutManager.width(), 530 - 280], 20, false, this.callback_swap_layers,
        (event:SlideEvent) => {
            const index:number = this.list.list.findIndex(element => element.slider === event.element);
            this.callback_slide_event(index, event.value);
        }, callback_get_error_parallel_array, callback_get_non_error_background_color);
        this.buttonAddLayer = new GuiButton(() => { this.pushList(`x*x-${this.runningId++}`); this.callback_onclick_event(0) }, "Add Function", this.layoutManager.width() / 2, 75, 16);
        this.layoutManager.addElement(new GuiLabel("Functions list:", this.layoutManager.width(), 20));
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
        if(this.callback_layer_count() !== this.list.list.length)
        {
            console.log("Error field layers out of sync with layers tool, attempting fix");
            this.list.list.length = 0;
        }
    }
};
window.addEventListener('load', function() {
    window.scrollTo(0, 1);
  });
class Function {
    source:string;
    dependencies:string[];
    variable_name:string;
    color:RGB;
    line_width:number;
    compiled:(x:number, dx:number) => number;
    discontinuities:number[];
    local_minima:number[];//x,y pairs
    local_maxima:number[];//x,y pairs
    zeros:number[];//x,y pairs
    points_of_inflection:number[];

    error_message:string | null;
    x_min:number;
    x_max:number;
    dx:number;
    not_function:boolean;
    table:DynamicFloat64Array;
    constructor(source:string)
    {
        this.source = source;
        this.dependencies = [];
        this.variable_name = "";
        this.not_function = false;
        this.error_message = null;
        this.line_width = 2;
        try{
            this.compiled = eval(`(x, dx) => ${source}`);
        }catch(e:any)
        {
            console.log(e.message);
            this.error_message = e.message;
        }
        this.local_maxima = [];
        this.local_minima = [];
        this.zeros = [];
        this.discontinuities = [];
        this.table = new DynamicFloat64Array(0);
        this.points_of_inflection = [];
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
            this.dependencies.length = 0;
            this.variable_name = "";
            this.error_message = null;
            try{
                this.compiled = eval(`(x, dx) => ${source}`);
                //find out if, and what variable is declared in this function
                //also find out what variables we are dependent on
                const gv_index = source.indexOf("gv.");
                if(gv_index !== -1)
                {
                    if(source.indexOf("=>") === -1)//not declaring a lambda
                    {
                        
                    }
                }
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
    calc_x_minmax(x:number, y1:number, y2:number, y3:number):number//returns min/max x value
    {
        const dxsq = this.dx*this.dx;
        const xsq = x*x;
        return -(((dxsq * y1 - xsq * y1 + 2 * x * y2 - y3) * (-this.dx * x * y1 + xsq * y1 + this.dx * y2 - 2 * x * y2 +
            y3))/dxsq*dxsq);
       
    }
    possibly_discontinous(x:number):boolean
    {
        for(let i = 0; i < this.discontinuities.length; i += 3)
        {
            if(x > this.discontinuities[i] && x < this.discontinuities[i + 1])
                return true;
        }
        return false;
    }
    x_to_index(x:number):number
    {
        return Math.floor((x - this.x_min) / (this.x_max - this.x_min) * this.table.length);
    }
    setup_calc_for(x_min:number, x_max:number, dx:number, iterations:number):void
    {
        this.x_max = x_max;
        this.x_min = x_min;
        this.dx = dx;
        this.points_of_inflection.length = 0;
        this.table.length = 0;
        this.zeros.length = 0;
        this.discontinuities.length = 0;
        this.local_maxima.length = 0;
        this.local_minima.length = 0;
        if(iterations > this.table.data.length)
        {
            this.table.reserve(iterations);
        }
        const result = this.call(this.x_min);
        
        this.not_function = (result === null  || this.source.indexOf("=>") !== -1);
    }
    perform_post_generation_precomputations(dx:number, calc_minmax:boolean, calc_zeros:boolean, calc_poi:boolean):void
    {
        for(let i = 1; i < this.table.length - 1; i++)
        {
            const prev_y = this.table.data[i - 1];
            const x = this.index_to_x(i);
            const y = this.table.data[i];
            const next_y = this.table.data[i + 1];
            const prev_delta_y = prev_y - y;
            const current_delta_y = y - next_y;
            const is_maxima = prev_delta_y < 0 && current_delta_y > 0;
            const is_minima = prev_delta_y > 0 && current_delta_y < 0;
            this.check_for_point_zero(calc_zeros, dx, x, y, prev_y, is_minima, is_maxima);
            const min_max_code = this.check_for_point_minmax(true, x, y, is_minima, is_maxima);
            this.check_for_point_of_inflection(calc_poi, i, x, y, prev_y, prev_delta_y, current_delta_y);
            if(min_max_code === 1)//maxima
            {
                if(this.local_minima.length > 0 && Math.abs(this.local_minima[this.local_minima.length - 2] + dx - this.local_maxima[this.local_maxima.length - 2]) < 1 / 100000000)
                {
                    //between this range is where a discontinuity may lie
                    const min = this.local_minima[this.local_minima.length - 2] - dx / 2;
                    const max = this.local_maxima[this.local_maxima.length - 2] + dx / 2;
                    this.discontinuities.push(min);
                    this.discontinuities.push(max);
                    this.discontinuities.push(min_max_code);
                }
            }
            else if(min_max_code === -1)
            {
                if(this.local_maxima.length > 0 && Math.abs(this.local_maxima[this.local_maxima.length - 2] + dx - this.local_minima[this.local_minima.length - 2]) < 1 / 100000000)
                {
                    const min = this.local_maxima[this.local_maxima.length - 2] - dx / 2;
                    const max = this.local_minima[this.local_minima.length - 2] + dx / 2;
                    this.discontinuities.push(min);
                    this.discontinuities.push(max);
                    this.discontinuities.push(min_max_code);
                }
            }

            
        }

    }
    calc_next(index:number, dx:number):number
    {
        const x = this.x_min + index * dx;
        const y = this.call(x);
        if(y !== null)
            this.table.push(y);
        return this.table[index];
    }
    calc_for(x_min:number, x_max:number, dx:number, calc_minmax:boolean, calc_zeros:boolean, calc_poi:boolean):DynamicFloat64Array
    {
        const iterations = (this.x_max - this.x_min) / this.dx;
        this.setup_calc_for(x_min, x_max, dx, iterations);
        try {
            for(let j = 0; j < iterations; j++)
            {
                this.calc_next(j, dx);
            }
        } catch (error:any)
        {
            console.log(error.message);
            this.error_message = error.message;
        }
        this.perform_post_generation_precomputations(dx, calc_minmax, calc_zeros, calc_poi);
        return this.table;
    }    
    check_for_point_minmax(calc_minmax:boolean, x:number, y:number, is_minima:boolean, is_maxima:boolean):number
    {
        if(!calc_minmax)
            return 0;
        if(is_maxima)// maxima
        {
            this.local_maxima.push(x);
            this.local_maxima.push(y);
            return 1;
        }
        else if(is_minima)//minima
        {
            this.local_minima.push(x);
            this.local_minima.push(y);
            return -1;
        }
        
    }
    check_for_point_zero(calc_zeros:boolean, dx:number, x:number, y:number, prev_y:number, is_minima:boolean, is_maxima:boolean):void
    {
        if(!calc_zeros)
            return;

        if((prev_y < 0 && y > 0) || (prev_y > 0 && y < 0))
        {
            this.zeros.push(x);
            this.zeros.push(y);
        }
        else if((is_maxima || is_minima || y === 0) && 
            Math.abs(y) < dx)
        {
            this.zeros.push(x);
            this.zeros.push(y);
        }
    }
    check_for_point_of_inflection(calc_poi:boolean, i:number, x:number, y:number, prev_y:number, prev_delta_y:number, current_delta_y:number):void
    {
        if(!calc_poi && i <= 1)
            return;
            
        const prev_prev_y = this.table.data[i - 2];
        const ddy = prev_delta_y - current_delta_y;
        const prev_ddy = (prev_prev_y - prev_y) - prev_delta_y;
        if(sign(ddy) != sign(prev_ddy))
        {
            this.points_of_inflection.push(x);
            this.points_of_inflection.push(y);
        }
    }
    dist(a:number, b:number):number
    {
        return Math.abs(a-b);
    }
    optimize_xmax(min_x:number, max_x:number, it:number, fun:(x:number, dx:number) => number = (x:number, dx:number) => this.compiled(x, dx)):number
    {
        while(it > 0)
        {
            const delta = max_x - min_x;
            const dx = delta * (1/5);
            const mid = (min_x + max_x) * (1 / 2);
            const ly = fun(min_x + dx, this.dx);
            const hy = fun(max_x - dx, this.dx);
            if(ly > hy)
                max_x = mid;
            else
                min_x = mid;
            
            it--;
        }
        return (min_x + max_x) / 2;
    }
    optimize_xmin(min_x:number, max_x:number, it:number, fun:(x:number, dx:number) => number = (x:number, dx:number) => this.compiled(x, dx)):number
    {
        const y:number[] = [];
        while(it > 0)
        {
            const delta = max_x - min_x;
            const dx = delta * (1/5);
            const mid = (min_x + max_x) * (1 / 2);
            const ly = fun(min_x + dx, this.dx);
            const hy = fun(max_x - dx, this.dx);
            if(ly < hy)
                max_x = mid;
            else
                min_x = mid;
            
            it--;
        }
        return (min_x + max_x) / 2;
    }
    optimize_zero(min_x:number, max_x:number, it:number):number
    {
        const y:number[] = [];
        while(it > 0)
        {
            const delta = max_x - min_x;
            const dx = delta * (1/5);
            const mid = (min_x + max_x) * (1 / 2);
            const ly = this.compiled(min_x + dx, this.dx);
            const hy = this.compiled(max_x - dx, this.dx);
            if(Math.abs(ly) < Math.abs(hy))
                max_x = mid;
            else
                min_x = mid;
            
            it--;
        }
        return (min_x + max_x) / 2;
    }
    optimize_poi(min_x:number, max_x:number, it:number):number
    {
        //first check if is minima or is maxima in first der
        //then optimize respectively with first der instead of second der function values
        const y:number[] = [];
        const delta = max_x - min_x;
        const dx = delta * (1/5);
        const ly = dderx(this.compiled, min_x + dx, dx);
        const hy = dderx(this.compiled, max_x - dx, dx);
        if(ly >= 0 && hy < 0)//minima
        {
            return this.optimize_xmin(min_x, max_x, it, (x:number, dx:number) => derx(this.compiled, x, dx));
        }
        else 
        {
            return this.optimize_xmax(min_x, max_x, it, (x:number, dx:number) => derx(this.compiled, x, dx))
        }
    }
    index_to_x(index:number):number
    {
        return this.x_min + index * this.dx;
    }
    closest_in_array(x:number, data:number[]):number | null
    {
        if(data.length > 0)
        {
            let closest_index = 0;
            let dist = Math.abs(x - data[closest_index]);
            for(let i = 2;  i < data.length; i+=2)
            {
                const xi = data[i];
                const dist_xi = Math.abs(x - xi);
                if(dist! > dist_xi)
                {
                    dist = dist_xi;
                    closest_index = i;
                }
            }
            return closest_index;
        }
        return null;
    }
    closest_max(x:number):number | null
    {
        return this.closest_in_array(x, this.local_maxima);
    }
    closest_poi(x:number):number | null
    {
        return this.closest_in_array(x, this.points_of_inflection);
    }
    closest_min(x:number):number | null
    {
        return this.closest_in_array(x, this.local_minima);
    }
    closest_zero(x:number):number | null
    {
        return this.closest_in_array(x, this.zeros);
    }
    call(x:number):number | null
    {
        if(this.error_message === null)
        {
            try {
                return this.compiled(x, this.dx);
            } catch (error:any)
            {
                console.log(error.message);
                this.error_message = error.message;
            }
        }
        return null;
    }
};
class GridUIState implements UIState {
    grid:Game;
    constructor(grid:Game) {
        this.grid = grid;
    }
    draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): void {
        throw new Error('Method not implemented.');
    }
    handleKeyboardEvents(type: string, event: KeyboardEvent): void {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type: string, event: TouchMoveEvent): void {
        throw new Error('Method not implemented.');
    }
    transition(delta_time: number): UIState {
        throw new Error('Method not implemented.');
    }
};
class FollowCursor extends GridUIState {
    constructor(grid:Game)
    {
        super(grid);
    }
    draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): void {
        this.grid.render_labels_floating(ctx);
        if(this.grid.draw_point_labels && this.grid.chkbx_render_grid.checked)
            this.grid.render_x_y_label_screen_space(ctx, this.grid.touchPos);
    }
    handleKeyboardEvents(type: string, event: KeyboardEvent): void {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type: string, event: TouchMoveEvent): void {
        throw new Error('Method not implemented.');
    }
    transition(delta_time: number): UIState {
        if(this.grid.chkbx_render_zeros.checked)
        {
            this.grid.repaint = true;
            return new FollowNearestZero(this.grid);
        }
        else if(this.grid.chkbx_render_min_max.checked)
        {
            this.grid.repaint = true;
            return new FollowNearestMinMax(this.grid);
        }
        else if(this.grid.chkbx_render_intersections.checked)
        {
            this.grid.repaint = true;
            return new FollowNearestIntersection(this.grid);
        }
        else if(this.grid.chkbx_render_inflections.checked)
        {
            this.grid.repaint = true;
            return new FollowNearestPointOfInflection(this.grid);
        }
        return this;
    }

};
class FollowNearestZero extends GridUIState {
    constructor(grid:Game)
    {
        super(grid);
    }
    draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): void {
        this.grid.render_labels_zeros(ctx);
    }
    handleKeyboardEvents(type: string, event: KeyboardEvent): void {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type: string, event: TouchMoveEvent): void {
        throw new Error('Method not implemented.');
    }
    to_state(state:typeof GridUIState)
    {
        this.grid.repaint = true;
        this.grid.chkbx_render_zeros.checked = false;
        this.grid.chkbx_render_zeros.refresh();
        return new state(this.grid);
    }
    transition(delta_time: number): UIState {
        
        if(this.grid.chkbx_render_min_max.checked)
        {
            return this.to_state(FollowNearestMinMax);
        }
        else if(this.grid.chkbx_render_intersections.checked)
        {
            return this.to_state(FollowNearestIntersection);
        }
        else if(this.grid.chkbx_render_inflections.checked)
        {
            return this.to_state(FollowNearestPointOfInflection);
        }
        else if(!this.grid.chkbx_render_zeros.checked)
        {
            return this.to_state(FollowCursor);
        }
        return this;
    }

};
class FollowNearestMinMax extends GridUIState {
    constructor(grid:Game)
    {
        super(grid);
    }
    draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): void {
        this.grid.render_labels_min(ctx);
        this.grid.render_labels_max(ctx);
    }
    handleKeyboardEvents(type: string, event: KeyboardEvent): void {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type: string, event: TouchMoveEvent): void {
        throw new Error('Method not implemented.');
    }
    to_state(state:typeof GridUIState)
    {
        this.grid.repaint = true;
        this.grid.chkbx_render_min_max.checked = false;
        this.grid.chkbx_render_min_max.refresh();
        return new state(this.grid);
    }
    transition(delta_time: number): UIState {
        if(this.grid.chkbx_render_zeros.checked)
        {
            return this.to_state(FollowNearestZero);
        }
        else if(this.grid.chkbx_render_intersections.checked)
        {
            return this.to_state(FollowNearestIntersection);
        }
        else if(this.grid.chkbx_render_inflections.checked)
        {
            return this.to_state(FollowNearestPointOfInflection);
        }
        else if(!this.grid.chkbx_render_min_max.checked)
        {
            return this.to_state(FollowCursor);
        }
        return this;
    }

};
class FollowNearestIntersection extends GridUIState {
    grid:Game;
    constructor(grid:Game)
    {
        super(grid);
    }
    draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): void {
        this.grid.render_labels_intersection(ctx);
    }
    handleKeyboardEvents(type: string, event: KeyboardEvent): void {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type: string, event: TouchMoveEvent): void {
        throw new Error('Method not implemented.');
    }
    to_state(state:typeof GridUIState)
    {
        this.grid.repaint = true;
        this.grid.chkbx_render_intersections.checked = false;
        this.grid.chkbx_render_intersections.refresh();
        return new state(this.grid);
    }
    transition(delta_time: number): UIState {
        if(this.grid.chkbx_render_zeros.checked)
        {
            return this.to_state(FollowNearestZero);
        }
        else if(this.grid.chkbx_render_min_max.checked)
        {
            return this.to_state(FollowNearestMinMax);
        }
        else if(this.grid.chkbx_render_inflections.checked)
        {
            return this.to_state(FollowNearestPointOfInflection);
        }
        else if(!this.grid.chkbx_render_intersections.checked)
        {
            return this.to_state(FollowCursor);
        }
        return this;
    }

};
class FollowNearestPointOfInflection extends GridUIState {
    grid:Game;
    constructor(grid:Game)
    {
        super(grid);
    }
    draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): void {
        this.grid.render_labels_poi(ctx);
    }
    handleKeyboardEvents(type: string, event: KeyboardEvent): void {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type: string, event: TouchMoveEvent): void {
        throw new Error('Method not implemented.');
    }
    to_state(state:typeof GridUIState)
    {
        this.grid.repaint = true;
        this.grid.chkbx_render_inflections.checked = false;
        this.grid.chkbx_render_inflections.refresh();
        return new state(this.grid);
    }
    transition(delta_time: number): UIState {
        if(this.grid.chkbx_render_zeros.checked)
        {
            return this.to_state(FollowNearestZero);
        }
        else if(this.grid.chkbx_render_min_max.checked)
        {
            return this.to_state(FollowNearestMinMax);
        }
        else if(this.grid.chkbx_render_intersections.checked)
        {
            return this.to_state(FollowNearestIntersection);
        }
        else if(!this.grid.chkbx_render_inflections.checked)
        {
            return this.to_state(FollowCursor);
        }
        return this;
    }

};

class ScalingState implements UIState {
    field:Game;
    constructor(field:Game)
    {
        this.field = field;
    }
    draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): void {
        throw new Error('Method not implemented.');
    }
    
    handleKeyboardEvents(type: string, event: KeyboardEvent): void {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type: string, event: TouchMoveEvent): void {
        throw new Error('Method not implemented.');
    }
    set_scale(x_scale:number, y_scale:number):void
    {
        this.field.set_scale(x_scale, y_scale);
    }
    transition(delta_time: number): UIState {
        throw new Error('Method not implemented.');
    }

};
class ScalingState_XFrozen extends ScalingState {
    
    set_scale(x_scale:number, y_scale:number):void
    {
        this.field.set_scale(this.field.target_bounds.x_scale, y_scale);
    }
};
class ScalingState_YFrozen extends ScalingState {
    
    set_scale(x_scale:number, y_scale:number):void
    {
        this.field.set_scale(x_scale, this.field.target_bounds.y_scale);
    }
};
//ui should switch between 
//free form following cursor exactly
//finding nearest minima/maxima to cursor
class UIViewState implements GridUIState {
    grid: Game;
    burger_height:number;
    burger_width:number;
    hamburger_activated:boolean;
    tapped:boolean;
    velocity_x:number;
    coefficient_of_friction:number;
    last_touch_event:number;
    constructor(grid:Game)
    {
        this.grid = grid;
        this.burger_height = 120 * (isTouchSupported() ? 1.5 : 0.75);
        this.burger_width = 27 * (isTouchSupported() ? 3 : 1.5);
        this.hamburger_activated = false;
        this.tapped = false;
        this.velocity_x = 0;
        this.coefficient_of_friction = 0.02;
    }
    taking_user_input():boolean
    {
        return false;
    }
    burger_x():number
    {
        return this.grid.guiManager.x + this.grid.guiManager.width();
    }
    burger_y():number
    {
        return this.grid.options_gui_manager.y;
    }
    draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): void {
        const burger_x = this.burger_x();
        let burger_y = this.burger_y();
        let burger_height = this.burger_height;
        const burger_width = this.burger_width;
        ctx.fillStyle = "#8F8F8F";
        ctx.fillRect(burger_x, burger_y, burger_width, burger_height);
        ctx.strokeStyle = "#FFFFFF";
        ctx.strokeRect(burger_x, burger_y, burger_width, burger_height);
        ctx.fillStyle = "#DFDFDF";
        for(let i = 0; i < 4; i++)
        {
            ctx.fillRect(burger_x + burger_width / 10 * (i * 2 + 1), burger_y + burger_height / 4, burger_width / 10, burger_height / 2);
            const old_height = burger_height;
            burger_height /= 1.25;
            burger_y += (old_height - burger_height) / 2;
        }
    }
    handleKeyboardEvents(type: string, event: KeyboardEvent): void {

    }
    collision_predicate(type: string, event: TouchMoveEvent):boolean
    {
        throw new Error('Method not implemented.');
    }
    screen_to_burger_x(a:number):number
    {
        return a - (this.grid.guiManager.width() + this.burger_width / 2);
    }
    width():number
    {
        return (this.grid.guiManager.width());
    }
    height():number
    {
        return this.grid.guiManager.height();
    }
    move(delta_time:number):void
    {
        this.grid.set_gui_position(clamp(this.grid.guiManager.x + this.velocity_x * delta_time, -(this.grid.guiManager.width()), 1));
        this.velocity_x *= (1 - this.coefficient_of_friction);
        if(Math.abs(this.velocity_x) < .01)
            this.velocity_x = 0;
    }
    handleTouchEvents(type: string, event: TouchMoveEvent): void {      
        const touchPos = event.touchPos;if(!this.hamburger_activated)
        {
            //if(this.grid.guiManager.collision(touchPos))
                this.grid.guiManager.handleTouchEvents(type, event);
            //this.grid.options_gui_manager.handleTouchEvents(type, event);
        }
        if(type !== "hover")
        {

            this.hamburger_activated = ((!this.grid.options_gui_manager.elementTouched && this.burger_collision(touchPos[0], touchPos[1]) && this.collision_predicate(type, event)) || this.hamburger_activated);
        
            switch(type)
            {
                case("touchstart"):
                this.velocity_x = 0;
                if(touchPos[0] > this.burger_x() + this.burger_width ||
                    (touchPos[0] > this.grid.guiManager.x + this.grid.guiManager.width() ||
                     touchPos[1] > this.grid.guiManager.y + this.grid.guiManager.max_element_y_bounds()))
                {
                    const new_state = new UIViewStateTransitioningUI(this.grid);
                    new_state.closing = true;
                    this.grid.ui_state_manager.state = new_state;
                }
                break;
                case("touchend"):
                if(Date.now() - event.startTouchTime < 250)
                {
                    this.tapped = this.hamburger_activated || (this.burger_collision(touchPos[0], touchPos[1]) && !this.collision_predicate(type, event));
                }  
                this.hamburger_activated = false;
                break;
            }
            this.last_touch_event = Date.now();
        }
    }
    burger_collision(x:number, y:number):boolean
    {
        return x >= this.burger_x() && x < this.burger_x() + this.burger_width 
                && y >= this.burger_y() && y < this.burger_y() + this.burger_height * 2;
    }
    transition(delta_time: number): UIState {
        if(this.hamburger_activated)
        {
            const new_position = clamp(this.screen_to_burger_x(this.grid.multi_touchListener.single_touch_listener.touchPos[0]), -(this.grid.guiManager.width()), 1);
            const delta = -this.grid.guiManager.x + new_position;
            const current_vel = -delta / (Date.now() - this.last_touch_event);

            this.velocity_x = delta * 0.02;
        }
        this.move(delta_time);
        return this;
    }

};
class UIViewStateShowUI extends UIViewState
{
    constructor(grid:Game)
    {
        super(grid);
    }
    draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): void {
        ctx.fillStyle = document.body.style.backgroundColor;
        ctx.fillRect(this.grid.guiManager.elements[0].x + this.grid.guiManager.x, this.grid.guiManager.elements[0].y + this.grid.guiManager.y, this.grid.guiManager.elements[0].width(), 
                this.grid.guiManager.elements[0].max_element_y_bounds());
        ctx.fillRect(this.grid.guiManager.elements[1].x + this.grid.guiManager.x, this.grid.guiManager.elements[1].y + this.grid.guiManager.y, this.grid.guiManager.elements[1].width(), 
                this.grid.guiManager.elements[1].max_element_y_bounds());
        super.draw(ctx, canvas, x, y, width, height);
        if(!this.grid.multi_touchListener.registeredMultiTouchEvent)
        {
            this.grid.guiManager.draw(ctx);
        }
    }
    handleKeyboardEvents(type: string, event: KeyboardEvent): void {
        this.grid.guiManager.handleKeyBoardEvents(type, event);
        this.grid.repaint = true;
    }
    collision_predicate(type: string, event: TouchMoveEvent):boolean
    {
        return true;
    }
    transition(delta_time: number): UIState {
        return super.transition(delta_time);
    }
};
class UIViewStateNoUI extends UIViewState {
    constructor(grid:Game)
    {
        super(grid);
    }
    taking_user_input():boolean
    {
        return true;
    }
    collision_predicate(type: string, event: TouchMoveEvent):boolean
    {
        return event.deltaX >= 0;
    }
    handleTouchEvents(type: string, event: TouchMoveEvent): void {
        super.handleTouchEvents(type, event);
        if(this.burger_collision(event.touchPos[0], event.touchPos[1])) {}//do noting
        else if(type === "touchstart")
            this.grid.make_closest_curve_selected(this.grid.screen_to_world(event.touchPos));
        else if(type === "touchmove")
        {
            let scaler_x = this.grid.target_bounds.deltaX / (this.grid.width);
            let scaler_y = this.grid.target_bounds.deltaY / (this.grid.height);
            this.grid.target_bounds.y_translation -= this.grid.scaling_multiplier * scaler_y * (event.deltaY);
            this.grid.target_bounds.x_translation -= this.grid.scaling_multiplier * scaler_x * (event.deltaX);
        }
    }
    transition(delta_time: number): UIState {
        super.transition(delta_time);
        this.grid.update_touch_pos();
        const mod_x = (1000 / delta_time) * this.grid.target_bounds.deltaX / 30;
        const mod_y = (1000 / delta_time) * this.grid.target_bounds.deltaY / 30;
        if(keyboardHandler.keysHeld["ArrowUp"])
                this.grid.target_bounds.acceleration[1] = -mod_y;
        else if(!keyboardHandler.keysHeld["ArrowDown"])
            this.grid.target_bounds.acceleration[1] = -this.grid.target_bounds.velocity[1] * 3;
        
        if(keyboardHandler.keysHeld["ArrowDown"])
                this.grid.target_bounds.acceleration[1] = mod_y;

        if(keyboardHandler.keysHeld["ArrowLeft"])
        {
                this.grid.target_bounds.acceleration[0] = -mod_x;
        }
        else if(!keyboardHandler.keysHeld["ArrowRight"])
            this.grid.target_bounds.acceleration[0] = -this.grid.target_bounds.velocity[0] * 3;
        
        if(keyboardHandler.keysHeld["ArrowRight"])
                this.grid.target_bounds.acceleration[0] = mod_x;
        this.grid.target_bounds.update_state(delta_time);
        //console.log("no ui")
        if(this.tapped)
        {
            const new_state = new UIViewStateTransitioningUI(this.grid);
            new_state.opening = true;
            return new_state;
        }
        if(-this.grid.guiManager.x + 1 < this.grid.guiManager.width())
        {
            const new_state = new UIViewStateTransitioningUI(this.grid);
            new_state.hamburger_activated = this.hamburger_activated;
            return new_state;
        }
        return this;
    }

};
class UIViewStateTransitioningUI extends UIViewStateShowUI
{
    opening:boolean;
    closing:boolean;
    constructor(grid:Game)
    {
        super(grid);
        this.opening = false;
        this.closing = false;
    }
    transition(delta_time: number): UIState {
        //console.log("transitioning ui", this.opening, this.closing)
        if(this.tapped)
        {
            if(this.velocity_x < 0)
                this.closing = true;
            else
                this.opening = true;
        }
        if(this.opening)
            this.grid.set_gui_position(clamp(this.grid.guiManager.x + delta_time * 3, -(this.grid.guiManager.width()), 1));
        else if(this.closing)
            this.grid.set_gui_position(clamp(this.grid.guiManager.x - delta_time * 5, -(this.grid.guiManager.width()), 1));
        else
            super.transition(delta_time);
        
        if(this.grid.guiManager.x > 0)
        {
            this.grid.set_gui_position(0);
            const new_state = new UIViewStateShowingUI(this.grid);
            new_state.hamburger_activated = this.hamburger_activated;
            return new_state;
        }
        else if(-this.grid.guiManager.x + 1 > this.grid.guiManager.width())
        {
            this.grid.set_gui_position(-(this.grid.guiManager.width()));
            const new_state = new UIViewStateNoUI(this.grid);
            new_state.hamburger_activated = this.hamburger_activated && !this.closing;
            return new_state;
        }
        return this;
    }
};
class UIViewStateShowingUI extends UIViewStateShowUI
{
    collision_predicate(type: string, event: TouchMoveEvent):boolean
    {
        return event.deltaX < 0;
    }
    transition(delta_time: number): UIState {
        super.transition(delta_time);
        //console.log("showing ui", this.tapped)
        if(this.tapped)
        {
            const new_state = new UIViewStateTransitioningUI(this.grid);
            new_state.closing = true;
            return new_state;
        }
        if(this.grid.guiManager.x < 0)
        {
            const new_state = new UIViewStateTransitioningUI(this.grid);
            new_state.hamburger_activated = this.hamburger_activated;
            return new_state;
        }
        
        return this;
    }
};
class ViewTransformation {
    x_scale:number;
    y_scale:number;
    y_translation:number;
    x_translation:number;
    x_min :number;
    x_max :number;
    deltaX:number;
    y_min :number;
    y_max :number;
    deltaY:number;
    velocity:number[];
    acceleration:number[];
    constructor(x_scale:number, y_scale:number, x_translation:number, y_translation:number)
    {
        this.x_scale = x_scale;
        this.y_scale = y_scale;
        this.x_translation = x_translation;
        this.y_translation = y_translation;
        this.x_min = this.x_translation - 1 / this.x_scale;
        this.x_max = this.x_translation + 1 / this.x_scale;
        this.deltaX = this.x_max - this.x_min;
        this.y_min = this.y_translation - 1 / this.y_scale;
        this.y_max = this.y_translation + 1 / this.y_scale;
        this.deltaY = this.y_max - this.y_min;
        this.velocity = [0, 0];
        this.acceleration = [0, 0];
    }
    compare(target_bounds: ViewTransformation):boolean {
        return target_bounds.x_scale === this.x_scale && target_bounds.x_translation === this.x_translation && 
            target_bounds.y_scale === this.y_scale && target_bounds.y_translation === this.y_translation;
    }
    update_state(delta_time:number):void
    {
        const mult = delta_time / 1000;
        this.x_translation = clamp(this.x_translation + this.velocity[0] * mult, -max_32_bit_signed, max_32_bit_signed);
        this.y_translation = clamp(this.y_translation + this.velocity[1] * mult, -max_32_bit_signed, max_32_bit_signed);
        const velx_bounds = this.deltaX * 10;
        const vely_bounds = this.deltaX * 10;
        this.velocity[0] = clamp(this.velocity[0] + this.acceleration[0] * mult, -velx_bounds, velx_bounds);
        this.velocity[1] = clamp(this.velocity[1] + this.acceleration[1] * mult, -vely_bounds, vely_bounds);
        this.recalc();
    }
    stop_motion():void
    {
        this.velocity = [0, 0];
        this.acceleration = [0, 0];
    }
    recalc(x_scale:number = this.x_scale, y_scale:number = this.y_scale, x_translation:number = this.x_translation, y_translation:number = this.y_translation):void
    {
        this.x_scale = x_scale;
        this.y_scale = y_scale;
        this.x_translation = x_translation;
        this.y_translation = y_translation;
        this.x_min = this.x_translation - 1 / this.x_scale;
        this.x_max = this.x_translation + 1 / this.x_scale;
        this.deltaX = this.x_max - this.x_min;
        this.y_min = this.y_translation - 1 / this.y_scale;
        this.y_max = this.y_translation + 1 / this.y_scale;
        this.deltaY = this.y_max - this.y_min;
    }
    copy(other:ViewTransformation):ViewTransformation
    {
        this.recalc(other.x_scale, other.y_scale, other.x_translation, other.y_translation);
        return this;
    }
}
class Game extends SquareAABBCollidable {
    ui_state_manager:StateManagedUI;
    state_manager_grid:StateManagedUI;
    main_buf:Sprite;
    render_buf:Sprite;
    axes_buf:Sprite;
    background_color:RGB;
    guiManager:SimpleGridLayoutManager;
    options_gui_manager:SimpleGridLayoutManager;
    layer_manager:LayerManagerTool;
    touchListener:SingleTouchListener;
    touchPos:number[];
    multi_touchListener:MultiTouchListener;
    repaint:boolean;
    axes:Sprite;
    chkbx_render_grid:GuiCheckBox;
    chkbx_render_min_max:GuiCheckBox;
    chkbx_render_zeros:GuiCheckBox;
    chkbx_render_intersections:GuiCheckBox;
    chkbx_render_inflections:GuiCheckBox;
    chkbx_sync_curve_width:GuiCheckBox;
    slider_line_width:GuiSlider;
    color_controller:ColorPickerTool;

    selected_item:number;
    last_selected_item:number;

    draw_point_labels:boolean;
    draw_axes:boolean;
    draw_axis_labels:boolean;
    functions:Function[];
    multivariable_functions:Function[];
    rendering_functions:boolean;
    scaling_multiplier:number;
    graph_start_x:number;
    intersections:number[];//x,y
    cell_dim:number[];
    current_bounds:ViewTransformation;
    target_bounds:ViewTransformation;
    execution_time_delay:number;
    
    constructor(multi_touchListener:MultiTouchListener, touchListener:SingleTouchListener, x:number, y:number, width:number, height:number)
    {
        super(x, y, width, height);
        this.rendering_functions = false;
        this.intersections = [];
        this.last_selected_item = 0;
        this.execution_time_delay = 10;
        this.selected_item = 0;
        this.ui_state_manager = new StateManagedUI(new UIViewStateShowingUI(this));
        this.state_manager_grid = new StateManagedUI(new FollowCursor(this));
        this.scaling_multiplier = 1;
        this.repaint = true;
        this.multi_touchListener = multi_touchListener;
        this.touchListener = touchListener;

        this.touchPos = [multi_touchListener.single_touch_listener.touchPos[0], multi_touchListener.single_touch_listener.touchPos[1]];
        this.functions = [];
        this.draw_axes = true;
        this.draw_axis_labels = true;
        this.draw_point_labels = true;
        const whratio = width / (height > 0 ? height : width);
        this.target_bounds = new ViewTransformation(1/9, 1/9  * whratio, 0, 0);
        this.current_bounds = new ViewTransformation(1/9, 1/9 * whratio, 0, 0);
        this.graph_start_x = 200;
        const rough_dim = getWidth();
        this.background_color = new RGB(0, 0, 0, 0);
        this.cell_dim = [(getWidth()), (getHeight())];
        this.init(this.cell_dim[0], this.cell_dim[1], this.cell_dim[0], this.cell_dim[1]);
        this.guiManager = new SimpleGridLayoutManager([1,1000], [this.graph_start_x, getHeight()], 2, 2);
        this.layer_manager = this.new_layer_manager();
        this.axes = this.new_sprite();
        this.main_buf = this.new_sprite();
        this.render_buf = this.new_sprite();
        this.axes_buf = this.new_sprite();
        this.guiManager.addElement(vertical_group([this.layer_manager.layoutManager, new GuiSlider(0, [this.guiManager.width(), 50], (e:SlideEvent) => {
            this.scaling_multiplier = e.value * 4 + 1;
        })]));
        this.guiManager.activate();
        const touch_mod = isTouchSupported() ? 38 : 0;
        this.color_controller = new ColorPickerTool((color:RGB) => {
            if(this.functions[this.selected_item])
                this.functions[this.selected_item].color.copy(color);
            this.repaint = true;
        });
        this.slider_line_width = new GuiSlider(0, [125, 50 + touch_mod], (slide_event:SlideEvent) => {
            const state = slide_event.value;
            const line_width = 2 + Math.floor(state * 30);
            if(this.chkbx_sync_curve_width.checked)
                this.functions.forEach(foo => foo.line_width = line_width)
            if(this.functions[this.selected_item])
                this.functions[this.selected_item].line_width = line_width;
            this.repaint = true;
        });
        const width_label = new GuiLabel("Width", 75, 18, this.slider_line_width.height());
        this.color_controller.getOptionPanel()?.refresh();
        this.options_gui_manager = new SimpleGridLayoutManager(
            [400, 400], [(isTouchSupported() ? Math.max(getHeight(), getWidth()): getWidth()) - this.guiManager.x - this.guiManager.width() - 100, 
                this.slider_line_width.height() + 350 + touch_mod * 6.5 + this.color_controller.getOptionPanel()!.height()], this.guiManager.x + this.guiManager.width(), this.guiManager.y);
        
        const show_axes_label = new GuiLabel("Show Axes", 100, 18, 35);
        const show_axes_checkbox = new GuiCheckBox((event:any) => {
            this.draw_axes = event.checkBox.checked;
            this.repaint = true;
        }, 100, 50 + touch_mod, this.draw_axis_labels);
        const show_labels_label = new GuiLabel("Show Labels", 100, 18, 35);
        const show_labels_checkbox = new GuiCheckBox((event:any) => {
            this.draw_axis_labels = event.checkBox.checked
            this.repaint = true;
        }, 100, 50 + touch_mod, this.draw_axis_labels);
        const minmax_label = new GuiLabel("Min Max", 100, 18, 35);
        this.chkbx_render_min_max = new GuiCheckBox((event:any) => {
        }, 100, 50 + touch_mod, false);


        const zeros_label = new GuiLabel("Zeros", 100, 18, 35);
        this.chkbx_render_zeros = new GuiCheckBox((event:any) => {
        }, 100, 50 + touch_mod, false);
        const inflections_label = new GuiLabel("~Inflections", 100, 18, 35);
        this.chkbx_render_intersections = new GuiCheckBox((event:any) => {
        }, 100, 50 + touch_mod, false);
        const intersections_label = new GuiLabel("Intersections", 100, 18, 35);
        this.chkbx_render_inflections = new GuiCheckBox((event:any) => {
        }, 100, 50 + touch_mod, false);
        const change_show_label_state = () => { this.draw_point_labels = draw_points.checked; draw_points.refresh(); };
        const draw_points = new GuiCheckBox(change_show_label_state, 100, 50 + touch_mod, this.draw_axis_labels);
        const show_label = new GuiButton(() => { draw_points.checked = !draw_points.checked; change_show_label_state(); }, "Show point", 100, 50 + touch_mod, 18);
        
        const label_show_grid = new GuiLabel("Show Grid", 100, 18, 50 + touch_mod);
        this.chkbx_render_grid = new GuiCheckBox((e) => {
            this.repaint = true;
        }, 100, 50 + touch_mod, true);

        this.chkbx_sync_curve_width = new GuiCheckBox((event:any) => {
        }, 100, 50 + touch_mod, true);
        const sync_label = new GuiLabel("Sync", show_label.width(), 18, 50 + touch_mod);
       
       const dynamic_touch_based_grouping_type = (elements:GuiElement[]) => !isTouchSupported() ? vertical_group(elements) : horizontal_group(elements);
        
        this.options_gui_manager.addElement(
            vertical_group(
            [
                vertical_group(
                    [
                        dynamic_touch_based_grouping_type(
                            [
                                horizontal_group(
                                [
                                    vertical_group([show_axes_label, show_axes_checkbox]),
                                    vertical_group([show_labels_label, show_labels_checkbox])
                                ]),
                                horizontal_group(
                                [
                                    vertical_group([minmax_label, this.chkbx_render_min_max]), 
                                    vertical_group([zeros_label, this.chkbx_render_zeros])
                                ]),
                                horizontal_group(
                                [
                                    vertical_group([inflections_label, this.chkbx_render_inflections]),
                                    vertical_group([intersections_label, this.chkbx_render_intersections]),
                                ])
                            ])
                    ]),
                    dynamic_touch_based_grouping_type(
                    [
                        this.color_controller.localLayout,
                        dynamic_touch_based_grouping_type(
                        [
                            vertical_group(
                            [
                                dynamic_touch_based_grouping_type(
                                [
                                    horizontal_group([show_label, draw_points]),
                                    horizontal_group([label_show_grid, this.chkbx_render_grid])
                                ]),
                                dynamic_touch_based_grouping_type(
                                [
                                    horizontal_group(
                                        [
                                            sync_label,
                                            this.chkbx_sync_curve_width
                                        ]),
                                    horizontal_group([width_label, this.slider_line_width]),
                                    new GuiSpacer([isTouchSupported()?1:0,0])
                                ])
                            ])
                        ]),
                        new GuiSpacer([isTouchSupported()?1:0,0])
                    ])
                
            ]));

        this.options_gui_manager.setWidth(this.options_gui_manager.max_element_x_bounds());
        this.options_gui_manager.activate();
        this.options_gui_manager.trimDim();
        this.guiManager.trimDim();
        this.guiManager = horizontal_group([this.guiManager, this.options_gui_manager]);
        this.guiManager.trimDim();
        this.repaint = true;
    }
    init(width:number, height:number, cell_width:number, cell_height:number):void
    {
        const whratio = width / (height > 0 ? height : width);
        this.target_bounds.y_scale = this.target_bounds.x_scale * whratio;
        this.resize(width, height);

        this.background_color = new RGB(0, 0, 0, 0);
        this.cell_dim = [cell_width, cell_height];
        this.main_buf = this.new_sprite();
        this.render_buf = this.new_sprite();
        this.axes_buf = this.new_sprite();
        this.axes = this.new_sprite();
        this.repaint = true;
    }
    new_layer_manager():LayerManagerTool
    {
        const layer_manager = new LayerManagerTool(5, () => { this.add_layer(); }, 
        (layer:number, state:boolean) => this.repaint = true,
        (layer:number) => {this.functions.splice(layer, 1); this.repaint = true},
        () => this.functions.length,
        (layer:number) => {this.repaint = true; this.change_selected(layer);},
        (layer:number, slider_value:number) => {console.log('layer', layer,'slider val', slider_value); return 0 },
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
    set_gui_position(x:number = this.guiManager.x, y:number = this.guiManager.y):void
    {
        this.guiManager.x = x;
        this.guiManager.y = y;
    }
    calc_bounds():void
    {
        this.target_bounds.recalc();
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
    new_sprite():Sprite
    {   
        const pixels = (new Array<RGB>(this.cell_dim[1] * this.cell_dim[0])).fill(this.background_color, 0, this.cell_dim[1] * this.cell_dim[0]);
        return new Sprite(pixels, this.cell_dim[0], this.cell_dim[1], false);
    }
    
    resize(width:number, height:number):void
    {
        this.width = width;
        this.height = height;
        this.cell_dim = [width, height];
        this.calc_bounds();
        if(this.options_gui_manager)
            this.options_gui_manager.setWidth(this.options_gui_manager.max_element_x_bounds());
    }
    static _colores:RGB[] = [new RGB(231, 76, 60),
        new RGB(225, 180, 25),
        new RGB(55, 152, 219),
        new RGB(182, 12, 255),
        new RGB(46, 204, 113),
        new RGB(245, 146, 65),
        new RGB(51, 204, 0)];
    async regenerate_curve_view(main_buf:Sprite):Promise<void>
    {
        this.rendering_functions = true;
        this.calc_bounds();
        const target_bounds = new ViewTransformation(1,1,1,1);
        target_bounds.copy(this.target_bounds);
        main_buf.ctx.clearRect(0, 0, main_buf.width, main_buf.height);

        this.calc_bounds();
        //bounds being rendered and bounds
        let functions:Function[] = this.functions;
        this.layer_manager.list.list.forEach((li:GuiListItem, index:number) => {
            const text = li.textBox.text;
            if(!this.main_buf)
            {
                this.main_buf = (this.new_sprite());
            }
            if(!this.functions[index])
            {
                let offset = (Math.random() * 150 - 75);
                offset = Math.abs(offset) < 50 ?Math.abs(offset) < 20 ? 5 : 3 * offset : offset;
                offset = index < Game._colores.length ? 0 : offset;
                const color = new RGB(
                clamp(offset + Game._colores[index % Game._colores.length].red(), 0, 255),
                clamp(offset + Game._colores[index % Game._colores.length].green(), 0, 255),
                clamp(offset + Game._colores[index % Game._colores.length].blue(), 0, 255),
                255);
                const foo = new Function(text);
                foo.color = color;
                functions.push(foo);
            }
            else
                functions[index].compile(text);
            
        });
        const dx = (target_bounds.x_max - target_bounds.x_min) / this.cell_dim[0] / 10 * Math.ceil(this.functions.length / 2); 
                    //this.chkbx_render_min_max.checked, this.chkbx_render_zeros.checked, this.chkbx_render_inflections.checked
        const iterations = (target_bounds.x_max - target_bounds.x_min) / dx;

        //setup for table function curve generation run twice to ensure all functions can see global values declared
        for(let j = 0; j < 2; j++)
        for(let i = 0; i < this.functions.length; i++)
        {
            this.functions[i].setup_calc_for(target_bounds.x_min, target_bounds.x_max, dx, iterations);
        }
        const valid_functions = this.functions.filter((foo:Function) => foo.error_message === null && !foo.not_function);
        //table calculations
        for(let j = 0; j < iterations; j++)
        {
            for(let i = 0; i < valid_functions.length; i++)
            {
                valid_functions[i].calc_next(j, dx);
            }
        }
        //setup table metadata
        for(let i = 0; i < valid_functions.length; i++)
        {
            valid_functions[i].perform_post_generation_precomputations(dx, this.chkbx_render_min_max.checked, this.chkbx_render_zeros.checked, this.chkbx_render_inflections.checked);
        }
        const view = new Int32Array(main_buf.imageData!.data.buffer);
        main_buf.ctx.imageSmoothingEnabled = false;
        main_buf.ctx.lineJoin = "round";

        for(let index = 0; index < functions.length; index++) 
        {
            const foo = functions[index];
            if(this.layer_manager.list.list[index] && this.layer_manager.list.list[index].checkBox.checked)
            {
                main_buf.ctx.lineWidth = foo.line_width;
                //build table of points, intersections, zeros, min/maxima inflections to be rendered
                //foo.calc_for(target_bounds.x_min, target_bounds.x_max, (target_bounds.x_max - target_bounds.x_min) / this.cell_dim[0] / 10 * Math.ceil(this.functions.length / 2), 
                //    this.chkbx_render_min_max.checked, this.chkbx_render_zeros.checked, this.chkbx_render_inflections.checked);
                
                let start_time = Date.now();
                //render table to main buffer
                let last_x = 0;
                let last_y = ((-foo.table.data[0] - target_bounds.y_min) / target_bounds.deltaY) * this.cell_dim[1];
                
                let lastp_x = 0;
                let lastp_y = ((-foo.table.data[0] - target_bounds.y_min) / target_bounds.deltaY) * this.cell_dim[1];
                //setup state for for loop (if error is non null then the table will be empty)
                if(foo.error_message !== null)
                    continue;
                main_buf.ctx.beginPath();
                main_buf.ctx.strokeStyle = foo.color.htmlRBG();
                main_buf.ctx.moveTo(this.world_x_to_screen(foo.x_min, target_bounds), this.world_y_to_screen(foo.table.data[0], target_bounds));
                
                for(let i = 1, j = 0; i < foo.table.length; i++)
                {
                    const x = target_bounds.x_min + foo.dx * i;
                    const y = foo.table.data[i];
                    //transform worldspace coordinates to screen space for rendering
                    const sy = this.world_y_to_screen(y);
                    const sx = this.world_x_to_screen(x);
                    //render functions as lines between points in table to buffers
                    if(sx > last_x || sy !== last_y)
                    {
                        if(foo.discontinuities[j] < x)
                        {
                            const optimized_x = foo.optimize_xmax(foo.discontinuities[j] - 4*foo.dx, foo.discontinuities[j+1] + 4*foo.dx, 50,
                                 (x, dx) => Math.abs(foo.compiled(x,dx)));
                            //+- the min max bounds clamps functions
                            const min_max_bounds = foo.compiled(optimized_x, foo.dx);
                            const max = this.world_y_to_screen(Math.min(-min_max_bounds, min_max_bounds), target_bounds);
                            const min = this.world_y_to_screen(Math.max(-min_max_bounds, min_max_bounds), target_bounds);
                        
                            if(foo.discontinuities[j + 2] === 1)//line to -inf then move to inf
                            {
                                main_buf.ctx.lineTo(sx, clamp(this.height + 50, min, max));
                                main_buf.ctx.moveTo(sx, clamp(-50, min, max));
                            }
                            else
                            {
                                main_buf.ctx.lineTo(sx, clamp(-50, min, max));
                                main_buf.ctx.moveTo(sx, clamp(this.height + 50, min, max));
                            }
                            j += 3;
                        }
                        else
                            main_buf.ctx.lineTo(sx, sy);
                        lastp_x = last_x;
                        lastp_y = last_y;
                        last_x = sx;
                        last_y = sy;
                    }
                    if((i % 256) === 0)
                    {
                        main_buf.ctx.stroke();
                        main_buf.ctx.beginPath();
                        main_buf.ctx.moveTo(last_x, last_y);
                    }
                    if(Date.now() - start_time > 15)
                    {
                        await sleep(2);
                        start_time = Date.now();
                    }
                }
                
                main_buf.ctx.stroke();
            }
        }
        //clear previous intersections calc just in case we end up with the wrong ones from a previous frame
        //better to have none than the wrong ones
        this.intersections.length = 0;
        //calculate points of intersection between two selected functions
        if(this.chkbx_render_intersections.checked && this.selected_item !== this.last_selected_item)
        {
            const fun1 = functions[this.selected_item];
            const fun2 = functions[this.last_selected_item];
            if(fun1 && fun2)
            {
                for(let j = 0; j < functions[0].table.length - 1; j++)
                {   
                    if(fun1.table.data[j+1] - fun2.table.data[j+1] === 0)
                    {
                        this.intersections.push(fun1.index_to_x(j));
                        this.intersections.push(fun1.table.data[j]);
                    }
                    else if(sign(fun1.table.data[j] - fun2.table.data[j]) !== sign(fun1.table.data[j + 1] - fun2.table.data[j + 1]))
                    {
                        this.intersections.push(fun1.index_to_x(j));
                        this.intersections.push(fun1.table.data[j]);
                    }
                }
            }
        }
        
        this.rendering_functions = false;
        const buf = this.render_buf;
        this.render_buf = this.main_buf;
        this.main_buf = buf;
        this.current_bounds.copy(target_bounds);
    }
    update_touch_pos():void
    {
        this.touchPos[0] = this.multi_touchListener.single_touch_listener.touchPos[0]
        this.touchPos[1] = this.multi_touchListener.single_touch_listener.touchPos[1];
    }
    optimize_intersection(fun1:Function, fun2:Function, min_x:number, max_x:number, it:number):number
    {
        try{
        const y:number[] = [];
        while(it > 0)
        {
            const delta = max_x - min_x;
            const dx = delta * (1/5);
            const mid = (min_x + max_x) * (1 / 2);
            const ly1 = fun1.compiled(min_x + dx, fun1.dx);
            const hy1 = fun1.compiled(max_x - dx, fun1.dx);
            const ly2 = fun2.compiled(min_x + dx, fun2.dx);
            const hy2 = fun2.compiled(max_x - dx, fun2.dx);
            if(Math.abs(ly1 - ly2) < Math.abs(hy1 - hy2))
                max_x = mid;
            else
                min_x = mid;
            
            it--;
        }
        }catch(error)
        {
            console.log(error.message);
        }   
        return (min_x + max_x) / 2;
    }
    render_axes(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number):void
    {
        //setup variables for rendering
        const font_size = 20;
        const screen_space_x_axis = clamp(this.world_y_to_screen(0), 0, this.cell_dim[1] - font_size / 2);
        const screen_space_y_axis = clamp(this.world_x_to_screen(0), 0, this.cell_dim[0]);
        
        if(this.draw_axes)
        {
            //render axes
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, screen_space_x_axis - 2, this.width, 4);
            ctx.fillRect(screen_space_y_axis - 2, 0, 4, this.height);
        }
        const msd_x = Math.pow(10, Math.floor(Math.log10(this.target_bounds.deltaX / 3)));
        const delta_x = msd_x;
        let closest_start_x = this.target_bounds.x_min;
        closest_start_x -= closest_start_x % delta_x;
        const msd_y = Math.pow(10, Math.ceil(-Math.log10(this.target_bounds.deltaY)));
        const delta_y = delta_x
        let closest_start_y = Math.ceil(this.target_bounds.y_min * msd_y * 10) / (msd_y*10);
        closest_start_y -= closest_start_y % delta_y;
        //calculate a starting x position
        let i = closest_start_x - delta_x;
        let last_render_x:number = -1;
        let last_render_text_width = 0;
        ctx.font = `${font_size}px Courier`;
        ctx.fillStyle = "#B4B4B4";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        //render points along x axis
        while(i < this.target_bounds.x_max)
        {
            ctx.fillStyle = "#B4B4B4";
            const screen_x = ((i - this.target_bounds.x_min) / this.target_bounds.deltaX) * this.width;

            if(this.draw_axis_labels)
            {
                ctx.strokeStyle = "#000000";
                ctx.strokeRect(screen_x - 3, screen_space_x_axis - 3, 6, 6);
                ctx.fillRect(screen_x - 3, screen_space_x_axis - 3, 6, 6);
            }
            if(this.chkbx_render_grid.checked)
                ctx.fillRect(screen_x, - 0.45, 0.9, this.height);
            {
                const screen_x = ((i + delta_x / 2 - this.target_bounds.x_min) / this.target_bounds.deltaX) * this.width;
                
                if(this.draw_axis_labels)
                    ctx.fillRect(screen_x - 3, screen_space_x_axis - 3, 6, 6);

                if(this.chkbx_render_grid.checked)
                {
                    ctx.fillRect(screen_x - 0.375, 0, 0.5, this.height);
                    const sdx = delta_x / this.target_bounds.deltaX * this.width;
                    ctx.fillRect(screen_x - 0.1 + sdx / 4, 0, 0.2, this.height);
                    ctx.fillRect(screen_x - 0.1 - sdx / 4, 0, 0.2, this.height);
                }
            }
            if(this.draw_axis_labels && screen_x > last_render_x + last_render_text_width + 10 && Math.abs(i) >= delta_x*15/16)
            {
                last_render_x = screen_x + 3;
                const text = this.format_number(i);
                const text_width = ctx.measureText(text).width;
                last_render_text_width = text_width;
                let text_y = screen_space_x_axis;
                if(text_y - font_size < 0)
                {
                    text_y += font_size + 10;
                }
                ctx.fillStyle = "#000000";
                ctx.strokeStyle = "#B4B4B4";
                ctx.lineWidth = 2;
                ctx.strokeText(text, screen_x + 3, text_y - 6);
                ctx.fillText(text, screen_x + 3, text_y - 6);
            }
            
            i += delta_x;
        }
        //calculate a starting y position
        i = closest_start_y - delta_y;
        let last_render_y = -font_size;
        const old_screen_space_y_axis = screen_space_y_axis;
        //render points along y axis
        while(i <= this.target_bounds.y_max)
        {
            ctx.strokeStyle = "#000000";
            ctx.fillStyle = "#B4B4B4";
            const screen_y = (i - this.target_bounds.y_min) / this.target_bounds.deltaY * this.height;
            if(this.draw_axis_labels)
            {
                ctx.strokeRect(old_screen_space_y_axis - 3, screen_y - 3, 6, 6);
                ctx.fillRect(old_screen_space_y_axis - 3, screen_y - 3, 6, 6);
            }
            if(this.chkbx_render_grid.checked) {
                ctx.fillRect(0, screen_y - 0.45, this.width, 0.9);
            }
            
            {
                const screen_y = (i + delta_y / 2 - this.target_bounds.y_min) / this.target_bounds.deltaY * this.height;
                if(this.draw_axis_labels)
                    ctx.fillRect(old_screen_space_y_axis - 3, screen_y - 3, 6, 6);
                if(this.chkbx_render_grid.checked){
                    ctx.fillRect(0, screen_y - 0.375, this.width, 0.75);

                    const sdy = delta_y / this.target_bounds.deltaY * this.height;
                    ctx.fillRect(0, screen_y - 0.1 + sdy / 4, this.width, 0.2);
                    ctx.fillRect(0, screen_y - 0.1 - sdy / 4, this.width, 0.2);
                }
            }
            if(this.draw_axis_labels && screen_y > last_render_y + font_size * 2)
            {
                last_render_y = screen_y;
                const text = Math.abs(i) >= delta_y / 16 ? this.format_number(-i) : 0 +"";
                const text_width = ctx.measureText(text).width;
                let text_x_pos = screen_space_y_axis;
                if(screen_space_y_axis + text_width > this.width)
                {
                    text_x_pos -= text_width + 10;
                }
                ctx.fillStyle = "#000000";
                ctx.strokeStyle = "#B4B4B4";
                ctx.lineWidth = 2;
                ctx.strokeText(text, text_x_pos + 3, screen_y - 4);
                ctx.fillText(text, text_x_pos + 3, screen_y - 4);
            }
            i += delta_y;
        }
    }
    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void 
    {
        const font_size = 24;
        if(+ctx.font.split("px")[0] != font_size)
        {
            ctx.font = `${font_size}px Helvetica`;
        }
        if((this.repaint || !this.current_bounds.compare(this.target_bounds)) && !this.rendering_functions)
        {
            this.repaint = false;
            
            this.regenerate_curve_view(this.render_buf);
        }
        const dx = (this.current_bounds.x_translation - this.target_bounds.x_translation) / this.target_bounds.deltaX * this.width;
        const dy = (this.current_bounds.y_translation - this.target_bounds.y_translation) / this.target_bounds.deltaY * this.height;
        
        const rx = this.target_bounds.x_scale / this.current_bounds.x_scale * this.width;
        const ry = this.target_bounds.y_scale / this.current_bounds.y_scale * this.height;
        const dw = this.width - rx;
        const dh = this.height - ry;
        this.calc_bounds();
        //render current curve view
        ctx.drawImage(this.main_buf.image, x + dx + dw / 2, y + dy + dh / 2, rx, ry);
        this.render_axes(canvas, ctx, x, y, width, height);
        //this state manager controls what labels get rendered
        if(this.draw_point_labels)
            this.state_manager_grid.draw(ctx, canvas, x, y, width, height);
        
        this.ui_state_manager.draw(ctx, canvas, x, y, width, height);
    }
    render_labels_floating(ctx:CanvasRenderingContext2D):void
    {
        const selected_function = this.functions[this.layer_manager.list.selected()];
        this.render_labels_table(ctx, 0, (x:number) => {
            return x;
        },
            (lower_bound:number, upper_bound:number, iterations) => {
                const x = (lower_bound + upper_bound) / 2;
                return [x, selected_function.table.get(selected_function.x_to_index(x))];
        });
    }
    render_labels_zeros(ctx:CanvasRenderingContext2D):void
    { 
        const selected_function = this.functions[this.layer_manager.list.selected()];
        this.render_labels_table(ctx, 0, (x:number) => {
            const index = selected_function.closest_zero(x);
            if(index !== null)
                return selected_function.zeros[index];
            return -1;
        },
            (lower_bound:number, upper_bound:number, iterations) => {
                const optimized_x = selected_function.optimize_zero(lower_bound, upper_bound, iterations);
                return [optimized_x, selected_function.call(optimized_x)!];
        });
    }
    render_labels_table(ctx:CanvasRenderingContext2D, offset_y:number, closest_in_array:(x:number) => number, optimization_function:(lower_bound:number, upper_bound:number, iterations:number) => number[]):void
    {
        const touchPos = this.touchPos;
        const screen_space_x_axis = -this.target_bounds.y_min >= 0 && -this.target_bounds.y_max <= 0 ? (0 - this.target_bounds.y_min) / this.target_bounds.deltaY * this.cell_dim[1] :  -this.target_bounds.y_min < 0 ? 0 : this.main_buf.height;
        let screen_space_y_axis = -this.target_bounds.x_min >= 0 && -this.target_bounds.x_max <= 0 ? (0 - this.target_bounds.x_min) / this.target_bounds.deltaX * this.cell_dim[0] : -this.target_bounds.x_min < 0 ? 0 : this.main_buf.width;
        let world_y:number = 0;
        let world_x = 0;
        const selected_function = this.functions[this.layer_manager.list.selected()];
        if(selected_function && this.layer_manager.list.selectedItem()?.checkBox.checked)
        {
            const touch_world_x = selected_function.x_min + touchPos[0] / this.main_buf.width * this.target_bounds.deltaX;
            
            const closest:number = closest_in_array(touch_world_x);
            if(closest !== -1)
            {
                world_x = closest;
                [ world_x, world_y ] = optimization_function(world_x - 2 * selected_function.dx, world_x + 2 * selected_function.dx, 2 << 10);
            }
            
            if(closest !== -1)
            {
                this.render_formatted_point(ctx, world_x, world_y, this.world_x_to_screen(world_x), this.world_y_to_screen(world_y), 2, -1 * +ctx.font.split("px")[0] + offset_y);
                const sx = (world_x - this.target_bounds.x_min) / this.target_bounds.deltaX * this.main_buf.width;
                ctx.beginPath();
                const y = ((-world_y - this.target_bounds.y_min) / this.target_bounds.deltaY) * this.height;
                ctx.moveTo(screen_space_y_axis, y);
                ctx.lineTo(sx, y);
                ctx.moveTo(sx, screen_space_x_axis);
                ctx.lineTo(sx, y);
                ctx.stroke();
            }
        }
    }
    render_labels_max(ctx:CanvasRenderingContext2D):void
    {
        const touchPos = this.multi_touchListener.single_touch_listener.touchPos;
        const selected_function = this.functions[this.layer_manager.list.selected()];
        this.render_labels_table(ctx, -0, (x:number) => {
            const index = selected_function.closest_max(x);
            if(index !== null)
                return selected_function.local_maxima[index];
            return -1;
        },
            (lower_bound:number, upper_bound:number, iterations) => {
                const optimized_x = selected_function.optimize_xmax(lower_bound, upper_bound, iterations);
                return [optimized_x, selected_function.call(optimized_x)!];
        });
    }
    render_labels_poi(ctx:CanvasRenderingContext2D):void
    {  
        const touchPos = this.multi_touchListener.single_touch_listener.touchPos;
        const selected_function = this.functions[this.layer_manager.list.selected()];
        this.render_labels_table(ctx, 0, (x:number) => {
            const index = selected_function.closest_poi(x);
            if(index !== null)
                return selected_function.points_of_inflection[index];
            return -1;
        },
            (lower_bound:number, upper_bound:number, iterations) => {
                const optimized_x = selected_function.optimize_poi(lower_bound, upper_bound, iterations);
                return [optimized_x, selected_function.call(optimized_x)!];
            });
    }
    closest_intersection(x:number):number | null
    {
        if(this.intersections.length > 0)
        {
            const fun1 = this.functions[this.layer_manager.list.selected()];
            const fun2 = this.functions[this.selected_item];
            let closest_intersection = 0;
            let dist = Math.abs(x - this.intersections[closest_intersection]);
            for(let i = 2;  i < this.intersections.length; i+=2)
            {
                const xi = this.intersections[i];
                const dist_xi = Math.abs(x - xi);
                if(dist! > dist_xi && !fun1.possibly_discontinous(xi) && !fun2.possibly_discontinous(xi))
                {
                    dist = dist_xi;
                    closest_intersection = i;
                }
            }
            return closest_intersection;
        }
        return null;
    }
    render_labels_intersection(ctx:CanvasRenderingContext2D):void
    {
        const selected_function = this.functions[this.layer_manager.list.selected()];
        if(!this.functions[this.selected_item])
            return;
        
        this.render_labels_table(ctx, 0, (x:number) => {
            const index = this.closest_intersection(x);
            if(index !== null)
                return this.intersections[index];
            return -1;
        },
            (lower_bound:number, upper_bound:number, iterations) => {
                const optimized_x = this.optimize_intersection(selected_function, 
                        this.functions[this.selected_item], lower_bound, upper_bound, iterations);
                return [optimized_x, selected_function.call(optimized_x)!];
        });
    }
    render_labels_min(ctx:CanvasRenderingContext2D):void
    {
        const selected_function = this.functions[this.layer_manager.list.selected()];
        this.render_labels_table(ctx, 0, (x:number) => {
            const index = selected_function.closest_min(x);
            if(index !== null)
                return selected_function.local_minima[index];
            return -1;
        },
            (lower_bound:number, upper_bound:number, iterations) => {
                const optimized_x = selected_function.optimize_xmin(lower_bound, upper_bound, iterations);
                return [optimized_x, selected_function.call(optimized_x)!];
        });
    }
    world_x_to_screen(x:number, bounds:ViewTransformation = this.target_bounds):number
    {
        return (x - bounds.x_min) / bounds.deltaX * this.main_buf.width;
    }
    world_y_to_screen(y:number, bounds:ViewTransformation = this.target_bounds):number
    {
        return (-y - bounds.y_min) / bounds.deltaY * this.main_buf.height;
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
        const world_x = ((touchPos[0] / this.width) * this.target_bounds.deltaX + this.target_bounds.x_min);
        const world_y = ((touchPos[1] / this.height) * this.target_bounds.deltaY + this.target_bounds.y_min);
        this.render_formatted_point(ctx, world_x, -world_y, touchPos[0], touchPos[1], precision);
    }
    render_x_y_label_world_space(ctx:CanvasRenderingContext2D, world_x:number, world_y:number, precision:number = 1, offset_y:number = 0):void
    {
        const screen_x = ((world_x - this.target_bounds.x_min) / this.target_bounds.deltaX) * this.width;
        const screen_y = clamp(((-world_y - this.target_bounds.y_min) / this.target_bounds.deltaY) * this.height, 30, this.height);
        this.render_formatted_point(ctx, world_x, world_y, screen_x, screen_y, precision, offset_y);
    }
    render_formatted_point(ctx:CanvasRenderingContext2D, world_x:number, world_y:number, screen_x:number, screen_y:number, precision:number = 2, offset_y:number = 0):void
    {
        ctx.lineWidth = 2.5;
        ctx.fillStyle = "#000000";
        ctx.strokeStyle = "#B4B4B4";
        const dim = 7;
        ctx.fillRect(screen_x - dim / 2, screen_y - dim / 2, dim, dim);
        ctx.strokeRect(screen_x - dim / 2, screen_y - dim / 2, dim, dim);
        let text:string;
        const decimal = Math.abs(world_x) < 1 << 16 && Math.abs(world_x) > Math.pow(2, -20) || Math.abs(world_x) < Math.pow(2, -35);
        try {
            text = `x: ${decimal ? round_with_precision(world_x, precision + 2) : world_x.toExponential(precision)} y: ${
                decimal ? round_with_precision(world_y, precision + 2) : world_y.toExponential(precision)}`;
            
            const text_width = ctx.measureText(text).width; 
            const font_size = +ctx.font.split('px')[0];           
            if(text_width + screen_x + dim > this.width)
            {
                screen_x -= text_width + dim * 2;
                screen_y += 3;
            }
            //add bounding to labels to prevent rendering off screen
            if(text_width + screen_x > this.main_buf.width)
                screen_x = this.main_buf.width - text_width - 10;
            else if(screen_x < 0)
                screen_x = 5;
            if(screen_y - font_size < 0)
                screen_y = font_size * 2;
            else if(screen_y > this.main_buf.height)
                screen_y = this.main_buf.height - font_size;
            ctx.strokeText(text, screen_x + dim, screen_y + dim / 2 + offset_y);
            ctx.fillText(text, screen_x + dim, screen_y + dim / 2 + offset_y);
            ctx.lineWidth = 1;
            ctx.fillStyle = "#FFFFFF";
            ctx.strokeStyle = "#000000";
        } catch(error:any)
        {
            console.log(error.message);
        }
    }
    format_number(value:number, precision:number = 2):string
    {
        const dim = 10;
        let text:string;
        if(Math.abs(value) < 1 << 16 && Math.abs(value) > 0.0001)
            text = `${round_with_precision(value, precision + 2)}`;
        else
            text = `${value.toExponential(precision)}`;            
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
    screen_to_world(coords:number[]):number[]
    {
        return [(coords[0] / this.width * this.target_bounds.deltaX + this.target_bounds.x_min),
                    (coords[1] / this.height * this.target_bounds.deltaY + this.target_bounds.y_min)];
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
        //update selected item
        if(this.layer_manager.list.selected() !== this.selected_item)
        {
            this.last_selected_item = this.selected_item;
            this.selected_item = this.layer_manager.list.selected();
        }
        const ms_to_fade = 250;
        //call transition function on state machine managing what points we are rendering
        this.state_manager_grid.transition(delta_time);
        this.ui_state_manager.transition(delta_time);
    }
    world_to_screen(point:number[]):number[]
    {
        return [this.world_x_to_screen(point[0]), this.world_y_to_screen(point[1])];
    }
    normalize_point(p:number[]):number[]
    {
        return [(p[0] - this.target_bounds.x_min) / this.target_bounds.deltaX, (p[1] - this.target_bounds.y_min) / this.target_bounds.deltaY];
    }
    round_to_grid(p:number[], cells:number[]):number[]
    {
        const normalized = this.normalize_point(p);
        const final = [(Math.floor(normalized[0] * cells[0]) * (this.target_bounds.deltaX / cells[0])) + this.target_bounds.x_min, 
            (Math.floor(normalized[1] * cells[1]) * (this.target_bounds.deltaY / cells[1])) + this.target_bounds.y_min];
        return final;
    }
    set_scale(x_scale:number, y_scale:number, keep_in_place:number[] = this.touchPos):void
    {
        const old_worldPos = this.screen_to_world(keep_in_place);
        this.target_bounds.x_scale = clamp(x_scale, 1 / max_32_bit_signed, max_32_bit_signed);
        this.target_bounds.y_scale = clamp(y_scale, 1 / max_32_bit_signed, max_32_bit_signed);
        this.calc_bounds();
        const new_worldPos = this.screen_to_world(keep_in_place);
        const dx = (new_worldPos[0] - old_worldPos[0]);
        const dy = (new_worldPos[1] - old_worldPos[1]);
        
        this.target_bounds.x_translation -= dx;
        this.target_bounds.y_translation -= dy;
    }
    x_to_index(x:number):number
    {
        return Math.floor((x - this.target_bounds.x_min) / this.target_bounds.deltaX * this.functions[0].table.length);
    }
    change_selected(new_selection:number):void
    {
        if(this.selected_item !== new_selection)
        {
            this.last_selected_item = this.selected_item;
            this.selected_item = new_selection;
            this.layer_manager.list.layoutManager.lastTouched = this.selected_item;
            this.repaint = true;
        }
        if(this.functions[this.selected_item])
        {
            this.slider_line_width.setState((this.functions[this.selected_item].line_width - 2) / 30);
            this.color_controller.set_color(this.functions[this.selected_item].color);
        }
    }
    make_closest_curve_selected(coords:number[]):void
    {
        const functions = this.functions.filter(foo => foo.error_message === null && !foo.not_function);
        const index = this.x_to_index(coords[0]);
        let min_dist:number = Math.abs(functions[0].table.data[index] + coords[1]);
        let min_dist_function_index = 0;
        functions.forEach((foo, arr_index) => {
            const dist = Math.abs(foo.table.data[index] + coords[1]);
            if(dist < min_dist && foo.table.data[index] !== undefined)
            {
                min_dist = dist;
                min_dist_function_index = this.functions.indexOf(foo);
            }
        });
        this.change_selected(min_dist_function_index);
    }
    graph_accepting_ui():boolean
    {
        const state = <UIViewState> this.ui_state_manager.state;
        return state.taking_user_input();
    }
};
const keyboardHandler = new KeyboardHandler();
async function main()
{
    const canvas:HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("screen");
    const touchListener = new SingleTouchListener(canvas, false, true, false);
    const multi_touch_listener = new MultiTouchListener(canvas, isTouchSupported(), true, true, 250);

    canvas.onmousemove = (event:MouseEvent) => {
    };
    const clamp_x = (x:number) => clamp(x, game.target_bounds.x_scale / 2, game.target_bounds.x_scale * 2);
    const clamp_y = (x:number) => clamp(x, game.target_bounds.y_scale / 2, game.target_bounds.y_scale * 2);
    const calc_scale = (scale, normalized_delta, clamp) => {
        scale -= normalized_delta * scale;
        return clamp(scale);
    }
    canvas.addEventListener("wheel", (e) => {
        if(Math.abs(e.deltaY) > 1000)
            return;
        const normalized_delta = (clamp(e.deltaY + 1, -getHeight(), getHeight())) / getHeight();
        if(game.graph_accepting_ui())
        {
            game.set_scale(calc_scale(game.target_bounds.x_scale, normalized_delta, clamp_x), calc_scale(game.target_bounds.y_scale, normalized_delta, clamp_y));
            game.repaint = true;
        }
    }, { passive:true });
    if(!('TouchEvent' in window))
        console.log("touch events not supported")
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
    }, { passive:false });
    canvas.style.cursor = "pointer";
    multi_touch_listener.registerCallBackPredicate("pinch", () => game.graph_accepting_ui(), (event:MultiTouchEvent) => {
        const normalized_delta = event.delta / Math.max(getHeight(), getWidth());
        game.set_scale(calc_scale(game.target_bounds.x_scale, normalized_delta, clamp_x), calc_scale(game.target_bounds.y_scale, normalized_delta, clamp_y),
            event.touchPos);
        game.repaint = true;
        event.preventDefault();
    });
    let width = getWidth();
    let height = getHeight();
    canvas.width = width;
    canvas.height = height;
    let game = new Game(multi_touch_listener, touchListener, 0, 0, height, width);
    window.game = game;
    let fps_text_width = 0;
    let render_fps = false;
    let low_fps:boolean = true;

    multi_touch_listener.registerCallBack("touchstart", (event:TouchMoveEvent) => {
        game.ui_state_manager.handleTouchEvents("touchstart", event);
        if(event.touchPos[0] > (game.width - fps_text_width - 10) && event.touchPos[1] < +ctx.font.split('px')[0] * 1.2)
            render_fps = !render_fps;
    });
    multi_touch_listener.registerCallBackPredicate("hover", (event:any) => true, (event:TouchMoveEvent) => {
        game.ui_state_manager.handleTouchEvents("hover", event);
    });
    multi_touch_listener.registerCallBackPredicate("touchend", (event:any) => true, (event:TouchMoveEvent) => {
        game.ui_state_manager.handleTouchEvents("touchend", event);
    });
    multi_touch_listener.registerCallBackPredicate("doubletap", (event:any) => true, (event:TouchMoveEvent) => {
        game.ui_state_manager.handleTouchEvents("doubletap", event);
    });
    multi_touch_listener.registerCallBackPredicate("longtap", (event:any) => true, (event:TouchMoveEvent) => {
        game.ui_state_manager.handleTouchEvents("longtap", event);
    });
    multi_touch_listener.registerCallBackPredicate("tap", (event:any) => true, (event:TouchMoveEvent) => {
        game.ui_state_manager.handleTouchEvents("tap", event);
    });
    multi_touch_listener.registerCallBackPredicate("touchmove", (event:any) => true, (event:TouchMoveEvent) => {
        game.ui_state_manager.state.handleTouchEvents("touchmove", event);
        game.repaint = true;
    });
    keyboardHandler.registerCallBack("keyup", () => true, (event:any) => {
        game.ui_state_manager.handleKeyboardEvents("keyup", event);
    });
    keyboardHandler.registerCallBack("keydown", () => true, (event:any) => {
        if(!keyboardHandler.keysHeld["MetaLeft"] && !keyboardHandler.keysHeld["ControlLeft"] &&
            !keyboardHandler.keysHeld["MetaRight"] && !keyboardHandler.keysHeld["ControlRight"])
            event.preventDefault();
        game.ui_state_manager.handleKeyboardEvents("keydown", event);
        switch(event.code)
        {
            case("KeyF"):
            render_fps = !render_fps;
            break;
            case("KeyQ"):
            game.target_bounds.x_translation = 0;
            game.target_bounds.y_translation = 0;
            break;
        }
    });
    let maybectx:CanvasRenderingContext2D | null = canvas.getContext("2d", {desynchronized:true});
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
            game.init(width, height, width, height);
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
        fps_text_width = ctx.measureText(text).width;
        if(render_fps)
        {
            ctx.strokeText(text, game.width - fps_text_width - 10, menu_font_size());
            ctx.fillText(text, game.width - fps_text_width - 10, menu_font_size());
        }
        game.execution_time_delay =  sum / time_queue.length / 10;
        requestAnimationFrame(drawLoop);
    }
    drawLoop();

}
main();