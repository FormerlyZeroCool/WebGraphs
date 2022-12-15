import { SingleTouchListener, isTouchSupported, MultiTouchListener, KeyboardHandler } from './io.js';
import { getHeight, getWidth, RGB, Sprite, GuiCheckList, GuiButton, SimpleGridLayoutManager, GuiLabel, GuiSlider, GuiCheckBox, GuiColoredSpacer, ExtendedTool, CustomBackgroundSlider, StateManagedUI } from './gui.js';
import { sign, srand, clamp, max_32_bit_signed, round_with_precision, FixedSizeQueue } from './utils.js';
import { menu_font_size, SquareAABBCollidable } from './game_utils.js';
window.sec = (x) => 1 / Math.sin(x);
window.csc = (x) => 1 / Math.cos(x);
window.cotan = (x) => 1 / Math.tan(x);
window.sin = Math.sin;
window.cos = Math.cos;
window.tan = Math.tan;
window.asin = Math.asin;
window.acos = Math.acos;
window.atan = Math.atan;
window.log = Math.log;
window.pow = Math.pow;
window.sqrt = Math.sqrt;
const derx = (foo, x, dx) => {
    return (foo(x + dx, dx) - foo(x, dx)) / dx;
};
window.derx = derx;
const dderx = (foo, x, dx) => {
    return (derx(foo, x + dx, dx) - derx(foo, x, dx)) / dx;
};
window.dderx = dderx;
class ColorPickerTool extends ExtendedTool {
    constructor(color_changed, toolName = "color picker", pathToImage = ["images/colorPickerSprite.png"], optionPanes = []) {
        super(toolName, pathToImage, optionPanes, [200, 220], [4, 50]);
        this.chosenColor = new GuiColoredSpacer([100, 32], new RGB(0, 150, 150, 255));
        const colorSlideEvent = (event) => {
            const color = new RGB(0, 0, 0, 0);
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
        this.hueSlider = new CustomBackgroundSlider(0, [150, slider_height], colorSlideEvent, (ctx, x, y, width, height) => {
            const color = new RGB(0, 0, 0, 0);
            if (this.color()) {
                const hsl = [this.hueSlider.state * 360, this.saturationSlider.state, this.lightnessSlider.state];
                const unitStep = 1 / width;
                let i = 0;
                for (let j = 0; j < 1; j += unitStep) {
                    hsl[0] = j * 360;
                    color.setByHSL(hsl[0], hsl[1], hsl[2]);
                    color.setAlpha(this.color().alpha());
                    ctx.fillStyle = color.htmlRBGA();
                    ctx.fillRect(j * width + x, y, unitStep * width, height);
                }
            }
        });
        this.saturationSlider = new CustomBackgroundSlider(1, [150, slider_height], colorSlideEvent, (ctx, x, y, width, height) => {
            const color = new RGB(0, 0, 0, 0);
            if (this.color()) {
                const hsl = [this.hueSlider.state * 360, this.saturationSlider.state, this.lightnessSlider.state];
                const unitStep = 1 / width;
                let i = 0;
                for (let j = 0; j < 1; j += unitStep) {
                    color.setByHSL(hsl[0], j, hsl[2]);
                    color.setAlpha(this.color().alpha());
                    ctx.fillStyle = color.htmlRBGA();
                    ctx.fillRect(j * width + x, y, unitStep * width, height);
                }
            }
        });
        this.lightnessSlider = new CustomBackgroundSlider(0, [150, slider_height], colorSlideEvent, (ctx, x, y, width, height) => {
            const color = new RGB(0, 0, 0, 0);
            if (this.color()) {
                const hsl = [this.hueSlider.state * 360, this.saturationSlider.state, this.lightnessSlider.state];
                const unitStep = 1 / width;
                let i = 0;
                for (let j = 0; j < 1; j += unitStep, i++) {
                    hsl[2] = j;
                    color.setByHSL(hsl[0], hsl[1], hsl[2]);
                    color.setAlpha(this.color().alpha());
                    ctx.fillStyle = color.htmlRBGA();
                    ctx.fillRect(i + x, y, unitStep * width, height);
                }
            }
        });
        this.localLayout.addElement(new GuiLabel("Color:", 100, 16));
        this.localLayout.addElement(this.chosenColor);
        const slidersLayout = new SimpleGridLayoutManager([4, 30], [200, slider_height * 3]);
        slidersLayout.addElement(new GuiLabel("Hue", 50, 16, slider_height));
        slidersLayout.addElement(this.hueSlider);
        slidersLayout.addElement(new GuiLabel("Sat.", 50, 16, slider_height));
        slidersLayout.addElement(this.saturationSlider);
        slidersLayout.addElement(new GuiLabel("Light", 50, 16, slider_height));
        slidersLayout.addElement(this.lightnessSlider);
        this.localLayout.addElement(slidersLayout);
        this.setColorText();
        this.hueSlider.refresh();
        this.saturationSlider.refresh();
        this.lightnessSlider.refresh();
    }
    color() {
        return this.chosenColor.color;
    }
    setColorText() {
        const color = this._setColorText();
        const hsl = color.toHSL();
        this.hueSlider.setState(hsl[0] / 360);
        this.saturationSlider.setState(hsl[1]);
        this.lightnessSlider.setState(hsl[2]);
    }
    _setColorText() {
        const color = new RGB(0, 0, 0);
        if (this.color())
            color.copy(this.color());
        this.chosenColor.color.copy(color);
        return color;
    }
    activateOptionPanel() { this.layoutManager.activate(); }
    deactivateOptionPanel() { this.layoutManager.deactivate(); }
    getOptionPanel() {
        return this.layoutManager;
    }
    optionPanelSize() {
        return [this.layoutManager.width(), this.layoutManager.height()];
    }
    drawOptionPanel(ctx, x, y) {
        const optionPanel = this.getOptionPanel();
        optionPanel.x = x;
        optionPanel.y = y;
        optionPanel.draw(ctx, x, y);
    }
}
;
class LayerManagerTool {
    constructor(limit = 16, callback_add_layer, callback_checkbox_event, callback_delete_layer, callback_layer_count, callback_onclick_event, callback_slide_event, callback_swap_layers, callback_get_error_parallel_array, callback_get_non_error_background_color) {
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
        this.list = new GuiCheckList([1, this.layersLimit], [this.layoutManager.width(), getHeight() - 280], 20, false, this.callback_swap_layers, (event) => {
            const index = this.list.list.findIndex(element => element.slider === event.element);
            this.callback_slide_event(index, event.value);
        }, callback_get_error_parallel_array, callback_get_non_error_background_color);
        this.buttonAddLayer = new GuiButton(() => { this.pushList(`x*x*${this.runningId++}`); this.callback_onclick_event(0); }, "Add Function", this.layoutManager.width() / 2, 75, 16);
        this.layoutManager.addElement(new GuiLabel("Functions list:", this.layoutManager.width(), 20));
        this.layoutManager.addElement(this.list);
        this.layoutManager.addElement(this.buttonAddLayer);
        this.layoutManager.addElement(new GuiButton(() => this.deleteItem(), "Delete", this.layoutManager.width() / 2, 75, 16));
        this.runningId = 2;
        this.pushList(`sin(x*x)`);
        this.list.refresh();
    }
    deleteItem(index = this.list.selected()) {
        if (this.list.list.length > 1 && this.list.list[index]) {
            this.list.delete(index);
            this.callback_delete_layer(index);
        }
    }
    pushList(text) {
        if (this.list.list.length < this.layersLimit) {
            if (this.callback_layer_count() < this.list.list.length) {
                this.callback_add_layer();
            }
            if (this.callback_layer_count() !== this.list.list.length)
                console.log("Error field layers out of sync with layers tool");
            this.list.push(text, true, (e) => {
                const index = this.list.findBasedOnCheckbox(e.checkBox);
                this.callback_checkbox_event(index, e.checkBox.checked);
            }, (e) => {
                this.list.list.forEach(el => el.textBox.deactivate());
                if (this.list.selectedItem() && this.list.selectedItem().checkBox.checked)
                    this.list.selectedItem().textBox.activate();
                this.callback_onclick_event(this.list.selected());
            });
            this.list.refresh();
        }
    }
    activateOptionPanel() { this.layoutManager.activate(); }
    deactivateOptionPanel() { this.layoutManager.deactivate(); }
    getOptionPanel() {
        return this.layoutManager;
    }
    optionPanelSize() {
        return [this.layoutManager.canvas.width, this.layoutManager.canvas.height];
    }
    drawOptionPanel(ctx, x, y) {
        const optionPanel = this.getOptionPanel();
        optionPanel.x = x;
        optionPanel.y = y;
        optionPanel.draw(ctx, x, y);
    }
}
LayerManagerTool.running_number = 0;
;
class Function {
    constructor(source) {
        this.source = source;
        this.error_message = null;
        try {
            this.compiled = eval(`(x, dx) => ${source}`);
        }
        catch (e) {
            console.log(e.message);
            this.error_message = e.message;
        }
        this.local_maxima = [];
        this.local_minima = [];
        this.zeros = [];
        this.table = [];
        this.points_of_inflection = [];
        this.x_max = 0;
        this.x_min = 0;
        this.dx = 0;
        this.color = new RGB(0, 0, 0, 0);
    }
    compile(source) {
        if (this.source !== source) {
            this.source = source;
            this.error_message = null;
            try {
                this.compiled = eval(`(x, dx) => ${source}`);
            }
            catch (e) {
                console.log(e.message);
                this.error_message = e.message;
            }
            this.x_max = 0;
            this.x_min = 0;
            this.dx = 0;
        }
    }
    calc_x_minmax(x, y1, y2, y3) {
        const dxsq = this.dx * this.dx;
        const xsq = x * x;
        return -(((dxsq * y1 - xsq * y1 + 2 * x * y2 - y3) * (-this.dx * x * y1 + xsq * y1 + this.dx * y2 - 2 * x * y2 +
            y3)) / dxsq * dxsq);
    }
    calc_for(x_min, x_max, dx, calc_minmax, calc_zeros, calc_poi) {
        this.x_max = x_max;
        this.x_min = x_min;
        this.dx = dx;
        this.points_of_inflection.length = 0;
        if (this.error_message !== null)
            return this.table;
        this.table.length = 0;
        this.zeros.length = 0;
        this.local_maxima.length = 0;
        this.local_minima.length = 0;
        try {
            const iterations = (this.x_max - this.x_min) / this.dx;
            for (let j = 0; j < iterations; j++) {
                const x = this.x_min + j * dx;
                this.table.push(this.compiled(x, this.dx));
            }
        }
        catch (error) {
            console.log(error.message);
            this.error_message = error.message;
        }
        for (let i = 1; i < this.table.length - 1; i++) {
            const prev_y = this.table[i - 1];
            const x = this.index_to_x(i);
            const y = this.table[i];
            const next_y = this.table[i + 1];
            const prev_delta_y = prev_y - y;
            const current_delta_y = y - next_y;
            const is_maxima = prev_delta_y < 0 && current_delta_y > 0;
            const is_minima = prev_delta_y > 0 && current_delta_y < 0;
            this.check_for_point_zero(calc_zeros, dx, x, y, prev_y, is_minima, is_maxima);
            this.check_for_point_minmax(calc_minmax, x, y, is_minima, is_maxima);
            this.check_for_point_of_inflection(calc_poi, i, x, y, prev_y, prev_delta_y, current_delta_y);
        }
        return this.table;
    }
    check_for_point_minmax(calc_minmax, x, y, is_minima, is_maxima) {
        if (!calc_minmax)
            return;
        if (is_maxima) // maxima
         {
            this.local_maxima.push(x);
            this.local_maxima.push(y);
        }
        else if (is_minima) //minima
         {
            this.local_minima.push(x);
            this.local_minima.push(y);
        }
    }
    check_for_point_zero(calc_zeros, dx, x, y, prev_y, is_minima, is_maxima) {
        if (!calc_zeros)
            return;
        if ((prev_y < 0 && y > 0) || (prev_y > 0 && y < 0)) {
            this.zeros.push(x);
            this.zeros.push(y);
        }
        else if ((is_maxima || is_minima || y === 0) &&
            Math.abs(y) < dx) {
            this.zeros.push(x);
            this.zeros.push(y);
        }
    }
    check_for_point_of_inflection(calc_poi, i, x, y, prev_y, prev_delta_y, current_delta_y) {
        if (!calc_poi && i <= 1)
            return;
        const prev_prev_y = this.table[i - 2];
        const ddy = prev_delta_y - current_delta_y;
        const prev_ddy = (prev_prev_y - prev_y) - prev_delta_y;
        if (sign(ddy) != sign(prev_ddy)) {
            this.points_of_inflection.push(x);
            this.points_of_inflection.push(y);
        }
    }
    dist(a, b) {
        return Math.abs(a - b);
    }
    optimize_xmax(min_x, max_x, it) {
        while (it > 0) {
            const delta = max_x - min_x;
            const dx = delta * (1 / 5);
            const mid = (min_x + max_x) * (1 / 2);
            const ly = this.compiled(min_x + dx, this.dx);
            const hy = this.compiled(max_x - dx, this.dx);
            if (ly > hy)
                max_x = mid;
            else
                min_x = mid;
            it--;
        }
        return (min_x + max_x) / 2;
    }
    optimize_xmin(min_x, max_x, it) {
        const y = [];
        while (it > 0) {
            const delta = max_x - min_x;
            const dx = delta * (1 / 5);
            const mid = (min_x + max_x) * (1 / 2);
            const ly = this.compiled(min_x + dx, this.dx);
            const hy = this.compiled(max_x - dx, this.dx);
            if (ly < hy)
                max_x = mid;
            else
                min_x = mid;
            it--;
        }
        return (min_x + max_x) / 2;
    }
    optimize_zero(min_x, max_x, it) {
        const y = [];
        while (it > 0) {
            const delta = max_x - min_x;
            const dx = delta * (1 / 5);
            const mid = (min_x + max_x) * (1 / 2);
            const ly = this.compiled(min_x + dx, this.dx);
            const hy = this.compiled(max_x - dx, this.dx);
            if (Math.abs(ly) < Math.abs(hy))
                max_x = mid;
            else
                min_x = mid;
            it--;
        }
        return (min_x + max_x) / 2;
    }
    optimize_poi(min_x, max_x, it) {
        const y = [];
        while (it > 0) {
            const delta = max_x - min_x;
            const dx = delta * (1 / 5);
            const mid = (min_x + max_x) * (1 / 2);
            const ly = dderx(this.compiled, min_x + dx, dx);
            const hy = dderx(this.compiled, max_x - dx, dx);
            if (Math.abs(ly) < Math.abs(hy))
                max_x = mid;
            else
                min_x = mid;
            it--;
        }
        return (min_x + max_x) / 2;
    }
    index_to_x(index) {
        return this.x_min + index * this.dx;
    }
    closest_in_array(x, data) {
        if (data.length > 0) {
            let closest_index = 0;
            let dist = Math.abs(x - data[closest_index]);
            for (let i = 2; i < data.length; i += 2) {
                const xi = data[i];
                const dist_xi = Math.abs(x - xi);
                if (dist > dist_xi) {
                    dist = dist_xi;
                    closest_index = i;
                }
            }
            return closest_index;
        }
        return null;
    }
    closest_max(x) {
        return this.closest_in_array(x, this.local_maxima);
    }
    closest_poi(x) {
        return this.closest_in_array(x, this.points_of_inflection);
    }
    closest_min(x) {
        return this.closest_in_array(x, this.local_minima);
    }
    closest_zero(x) {
        return this.closest_in_array(x, this.zeros);
    }
    call(x) {
        if (this.error_message === null) {
            try {
                return this.compiled(x, this.dx);
            }
            catch (error) {
                console.log(error.message);
                this.error_message = error.message;
            }
        }
        return null;
    }
}
;
class GridUIState {
    constructor(grid) {
        this.grid = grid;
    }
    draw(ctx, canvas, x, y, width, height) {
        throw new Error('Method not implemented.');
    }
    handleKeyboardEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    transition(delta_time) {
        throw new Error('Method not implemented.');
    }
}
;
class FollowCursor extends GridUIState {
    constructor(grid) {
        super(grid);
    }
    draw(ctx, canvas, x, y, width, height) {
        this.grid.render_labels_floating(ctx);
        //if(this.grid.draw_point_labels)
        //  this.grid.render_x_y_label_screen_space(ctx, this.grid.touchListener.touchPos);
    }
    handleKeyboardEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    transition(delta_time) {
        if (this.grid.chkbx_render_zeros.checked) {
            this.grid.repaint = true;
            return new FollowNearestZero(this.grid);
        }
        else if (this.grid.chkbx_render_min_max.checked) {
            this.grid.repaint = true;
            return new FollowNearestMinMax(this.grid);
        }
        else if (this.grid.chkbx_render_intersections.checked) {
            this.grid.repaint = true;
            return new FollowNearestIntersection(this.grid);
        }
        else if (this.grid.chkbx_render_inflections.checked) {
            this.grid.repaint = true;
            return new FollowNearestPointOfInflection(this.grid);
        }
        return this;
    }
}
;
class FollowNearestZero extends GridUIState {
    constructor(grid) {
        super(grid);
    }
    draw(ctx, canvas, x, y, width, height) {
        this.grid.render_labels_zeros(ctx);
    }
    handleKeyboardEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    to_state(state) {
        this.grid.repaint = true;
        this.grid.chkbx_render_zeros.checked = false;
        this.grid.chkbx_render_zeros.refresh();
        this.grid.options_gui_manager.refresh();
        return new state(this.grid);
    }
    transition(delta_time) {
        if (this.grid.chkbx_render_min_max.checked) {
            return this.to_state(FollowNearestMinMax);
        }
        else if (this.grid.chkbx_render_intersections.checked) {
            return this.to_state(FollowNearestIntersection);
        }
        else if (this.grid.chkbx_render_inflections.checked) {
            return this.to_state(FollowNearestPointOfInflection);
        }
        else if (!this.grid.chkbx_render_zeros.checked) {
            return this.to_state(FollowCursor);
        }
        return this;
    }
}
;
class FollowNearestMinMax extends GridUIState {
    constructor(grid) {
        super(grid);
    }
    draw(ctx, canvas, x, y, width, height) {
        this.grid.render_labels_min(ctx);
        this.grid.render_labels_max(ctx);
    }
    handleKeyboardEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    to_state(state) {
        this.grid.repaint = true;
        this.grid.chkbx_render_min_max.checked = false;
        this.grid.chkbx_render_min_max.refresh();
        this.grid.options_gui_manager.refresh();
        return new state(this.grid);
    }
    transition(delta_time) {
        if (this.grid.chkbx_render_zeros.checked) {
            return this.to_state(FollowNearestZero);
        }
        else if (this.grid.chkbx_render_intersections.checked) {
            return this.to_state(FollowNearestIntersection);
        }
        else if (this.grid.chkbx_render_inflections.checked) {
            return this.to_state(FollowNearestPointOfInflection);
        }
        else if (!this.grid.chkbx_render_min_max.checked) {
            return this.to_state(FollowCursor);
        }
        return this;
    }
}
;
class FollowNearestIntersection extends GridUIState {
    constructor(grid) {
        super(grid);
    }
    draw(ctx, canvas, x, y, width, height) {
        this.grid.render_labels_intersection(ctx);
    }
    handleKeyboardEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    to_state(state) {
        this.grid.repaint = true;
        this.grid.chkbx_render_intersections.checked = false;
        this.grid.chkbx_render_intersections.refresh();
        this.grid.options_gui_manager.refresh();
        return new state(this.grid);
    }
    transition(delta_time) {
        if (this.grid.chkbx_render_zeros.checked) {
            return this.to_state(FollowNearestZero);
        }
        else if (this.grid.chkbx_render_min_max.checked) {
            return this.to_state(FollowNearestMinMax);
        }
        else if (this.grid.chkbx_render_inflections.checked) {
            return this.to_state(FollowNearestPointOfInflection);
        }
        else if (!this.grid.chkbx_render_intersections.checked) {
            return this.to_state(FollowCursor);
        }
        return this;
    }
}
;
class FollowNearestPointOfInflection extends GridUIState {
    constructor(grid) {
        super(grid);
    }
    draw(ctx, canvas, x, y, width, height) {
        this.grid.render_labels_poi(ctx);
    }
    handleKeyboardEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    to_state(state) {
        this.grid.repaint = true;
        this.grid.chkbx_render_inflections.checked = false;
        this.grid.chkbx_render_inflections.refresh();
        this.grid.options_gui_manager.refresh();
        return new state(this.grid);
    }
    transition(delta_time) {
        if (this.grid.chkbx_render_zeros.checked) {
            return this.to_state(FollowNearestZero);
        }
        else if (this.grid.chkbx_render_min_max.checked) {
            return this.to_state(FollowNearestMinMax);
        }
        else if (this.grid.chkbx_render_intersections.checked) {
            return this.to_state(FollowNearestIntersection);
        }
        else if (!this.grid.chkbx_render_inflections.checked) {
            return this.to_state(FollowCursor);
        }
        return this;
    }
}
;
//ui should switch between 
//free form following cursor exactly
//finding nearest minima/maxima to cursor
class FunctionPoint extends SquareAABBCollidable {
    constructor(foo, x, y, width, height) {
        super(x, y, width, height);
        this.foo = foo;
    }
}
;
class Game extends SquareAABBCollidable {
    constructor(multi_touchListener, touchListener, x, y, width, height) {
        super(x, y, width, height);
        this.intersections = [];
        this.last_selected_item = 0;
        this.selected_item = 0;
        this.state_manager_grid = new StateManagedUI(new FollowCursor(this));
        this.scaling_multiplier = 1;
        this.ui_alpha = 0;
        this.repaint = true;
        this.multi_touchListener = multi_touchListener;
        this.touchListener = touchListener;
        this.functions = [];
        this.draw_axises = true;
        this.draw_axis_labels = true;
        this.draw_point_labels = true;
        this.x_min = this.x_translation * this.scale - 1 / this.scale;
        this.x_max = this.x_translation * this.scale + 1 / this.scale;
        this.deltaX = this.x_max - this.x_min;
        this.y_min = this.y_translation * this.scale - this.deltaX / 2;
        this.y_max = this.y_translation * this.scale + this.deltaX / 2;
        this.deltaY = this.y_max - this.y_min;
        this.scale = 1 / 10;
        this.x_translation = 0;
        this.y_translation = 0;
        this.graph_start_x = 200;
        const whratio = width / (height > 0 ? height : width);
        const rough_dim = getWidth();
        this.background_color = new RGB(0, 0, 0, 0);
        this.cell_dim = [getWidth(), getHeight() - 50];
        this.init(this.cell_dim[0], this.cell_dim[1], this.cell_dim[0], this.cell_dim[1]);
        this.guiManager = new SimpleGridLayoutManager([1, 1000], [this.graph_start_x, getHeight()], 0, 30);
        this.layer_manager = this.new_layer_manager();
        this.axises = this.new_sprite();
        this.main_buf = this.new_sprite();
        this.guiManager.addElement(this.layer_manager.layoutManager);
        this.guiManager.addElement(new GuiSlider(0, [this.guiManager.width(), 50], (e) => {
            this.scaling_multiplier = e.value * 4 + 1;
        }));
        this.guiManager.activate();
        const touch_mod = isTouchSupported() ? 38 : 0;
        const color_controller = new ColorPickerTool((color) => {
            this.functions[this.selected_item].color.copy(color);
            this.repaint = true;
        });
        color_controller.getOptionPanel()?.refresh();
        this.options_gui_manager = new SimpleGridLayoutManager([2, 40], [200, 350 + touch_mod * 6.5 + color_controller.getOptionPanel().height()], this.guiManager.x + this.guiManager.width(), this.guiManager.y);
        this.options_gui_manager.addElement(new GuiLabel("Show axises", 100));
        this.options_gui_manager.addElement(new GuiLabel("Show labels", 100));
        this.options_gui_manager.addElement(new GuiCheckBox((event) => {
            this.draw_axises = event.checkBox.checked;
            this.repaint = true;
        }, 50 + touch_mod, 50 + touch_mod, this.draw_axis_labels));
        this.options_gui_manager.addElement(new GuiCheckBox((event) => {
            this.draw_axis_labels = event.checkBox.checked;
            this.repaint = true;
        }, 50 + touch_mod, 50 + touch_mod, this.draw_axis_labels));
        const show_label = new GuiLabel("Show point", 100, 18, 50 + touch_mod);
        this.options_gui_manager.addElement(show_label);
        this.options_gui_manager.addElement(new GuiCheckBox((event) => {
            this.draw_point_labels = event.checkBox.checked;
        }, 50 + touch_mod, 50 + touch_mod, this.draw_axis_labels));
        const minmax_label = new GuiLabel("Min Max", 100, 18, 50 + touch_mod);
        this.options_gui_manager.addElement(minmax_label);
        this.chkbx_render_min_max = new GuiCheckBox((event) => {
        }, 50 + touch_mod, 50 + touch_mod, false);
        this.options_gui_manager.addElement(this.chkbx_render_min_max);
        const zeros_label = new GuiLabel("Zeros", 100, 18, 50 + touch_mod);
        this.options_gui_manager.addElement(zeros_label);
        this.chkbx_render_zeros = new GuiCheckBox((event) => {
        }, 50 + touch_mod, 50 + touch_mod, false);
        this.options_gui_manager.addElement(this.chkbx_render_zeros);
        const intersections_label = new GuiLabel("Intersections", 100, 18, 50 + touch_mod);
        this.options_gui_manager.addElement(intersections_label);
        this.chkbx_render_intersections = new GuiCheckBox((event) => {
        }, 50 + touch_mod, 50 + touch_mod, false);
        this.options_gui_manager.addElement(this.chkbx_render_intersections);
        const inflections_label = new GuiLabel("~Inflections", 100, 18, 50 + touch_mod);
        this.options_gui_manager.addElement(inflections_label);
        this.chkbx_render_inflections = new GuiCheckBox((event) => {
        }, 50 + touch_mod, 50 + touch_mod, false);
        this.options_gui_manager.addElement(this.chkbx_render_inflections);
        this.options_gui_manager.addElement(color_controller.localLayout);
        this.options_gui_manager.activate();
        this.repaint = true;
    }
    init(width, height, cell_width, cell_height) {
        this.resize(width, height);
        this.background_color = new RGB(0, 0, 0, 0);
        this.cell_dim = [cell_width, cell_height];
        this.main_buf = this.new_sprite();
        this.axises = this.new_sprite();
        this.repaint = true;
    }
    new_layer_manager() {
        const layer_manager = new LayerManagerTool(10, () => { this.add_layer(); }, (layer, state) => this.repaint = true, (layer) => { this.functions.splice(layer, 1); this.repaint = true; }, () => this.functions.length, (layer) => this.repaint = true, (layer, slider_value) => { console.log('layer', layer, 'slider val', slider_value); return 0; }, (l1, l2) => { this.swap_layers(l1, l2); this.repaint = true; }, (layer) => this.functions[layer] ? this.functions[layer].error_message : null, (layer) => {
            return this.functions[layer] ? this.functions[layer].color : null;
        });
        if (this.layer_manager) {
            layer_manager.list.list = this.layer_manager.list.list;
        }
        return layer_manager;
    }
    calc_bounds() {
        this.x_min = this.x_translation - 1 / this.scale;
        this.x_max = this.x_translation + 1 / this.scale;
        this.deltaX = this.x_max - this.x_min;
        this.y_min = this.y_translation - this.deltaX / 2;
        this.y_max = this.y_translation + this.deltaX / 2;
        this.deltaY = this.y_max - this.y_min;
    }
    add_layer() {
        this.functions.push(new Function(""));
        this.repaint = true;
    }
    swap_layers(l1, l2) {
        const temp = this.functions.splice(l1, 1)[0];
        this.functions.splice(l2, 0, temp);
    }
    set_place(index, color) {
        const view = new Int32Array(this.main_buf.imageData.data.buffer);
        if (view[index] !== undefined) {
            view[index] = color;
            return true;
        }
        return false;
    }
    get_place(index) {
        const view = new Int32Array(this.main_buf.imageData.data.buffer);
        if (view[index] !== undefined) {
            return view[index];
        }
        return null;
    }
    is_background(index) {
        const view = new Int32Array(this.main_buf.imageData.data.buffer);
        return this.get_place(index) == this.background_color.color;
    }
    clear_place(removed) {
        const view = new Int32Array(this.main_buf.imageData.data.buffer);
        if (view[removed] !== undefined) {
            view[removed] = this.background_color.color;
            return true;
        }
        return false;
    }
    restart_game() {
        this.init(this.width, this.height, this.cell_dim[0], this.cell_dim[1]);
    }
    new_sprite() {
        const pixels = (new Array(this.cell_dim[1] * this.cell_dim[0])).fill(this.background_color, 0, this.cell_dim[1] * this.cell_dim[0]);
        return new Sprite(pixels, this.cell_dim[0], this.cell_dim[1], false);
    }
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.calc_bounds();
    }
    try_render_functions() {
        //figure out bounds for calculation of function tables
        this.calc_bounds();
        let functions = this.functions;
        this.layer_manager.list.list.forEach((li, index) => {
            const text = li.textBox.text;
            if (!this.main_buf) {
                this.main_buf = (this.new_sprite());
            }
            if (!this.functions[index]) {
                const color = new RGB(clamp(0, 255, 45 + (index + 2) * 60 % 256), clamp(0, 255, 45 + index + 1 * 150 % 256), clamp(0, 255, 45 + index * 85 % 256), 255);
                const foo = new Function(text);
                foo.color = color;
                functions.push(foo);
            }
            else
                functions[index].compile(text);
        });
        const view = new Int32Array(this.main_buf.imageData.data.buffer);
        this.main_buf.ctx.lineWidth = 2;
        this.main_buf.ctx.imageSmoothingEnabled = false;
        this.main_buf.ctx.lineJoin = "bevel";
        functions.forEach((foo, index) => {
            if (this.layer_manager.list.list[index] && this.layer_manager.list.list[index].checkBox.checked) {
                //build table of points, intersections, zeros, min/maxima inflections to be rendered
                foo.calc_for(this.x_min, this.x_max, (this.x_max - this.x_min) / this.cell_dim[0] / 10 * Math.ceil(this.functions.length / 2), this.chkbx_render_min_max.checked, this.chkbx_render_zeros.checked, this.chkbx_render_inflections.checked);
                //render table to main buffer
                let last_x = 0;
                let last_y = ((-foo.table[0] - this.y_min) / this.deltaY) * this.cell_dim[1];
                //setup state for for loop (if error is non null then the table will be empty)
                if (foo.error_message === null) {
                    this.main_buf.ctx.beginPath();
                    this.main_buf.ctx.strokeStyle = foo.color.htmlRBG();
                    this.main_buf.ctx.moveTo(this.world_x_to_screen(foo.index_to_x(0)), this.world_y_to_screen(foo.table[0]));
                }
                for (let i = 1; i < foo.table.length; i++) {
                    const x = this.x_min + foo.dx * i;
                    const y = -foo.table[i];
                    //transform worldspace coordinates to screen space for rendering
                    const sy = clamp(((y - this.y_min) / this.deltaY) * this.cell_dim[1], -20, this.main_buf.height + 20);
                    const sx = clamp(((x - this.x_min) / this.deltaX) * this.cell_dim[0], -20, this.main_buf.width + 20);
                    //render functions as lines between points in table to buffers
                    if (sx > last_x || sy !== last_y) {
                        this.main_buf.ctx.lineTo(sx, sy);
                        last_x = sx;
                        last_y = sy;
                    }
                }
                this.main_buf.ctx.stroke();
            }
        });
        //clear previous intersections calc just in case we end up with the wrong ones from a previous frame
        //better to have none than the wrong ones
        this.intersections.length = 0;
        //calculate points of intersection between two selected functions
        if (this.chkbx_render_intersections.checked && this.selected_item !== this.last_selected_item) {
            const fun1 = functions[this.selected_item];
            const fun2 = functions[this.last_selected_item];
            if (fun1 && fun2) {
                for (let j = 0; j < functions[0].table.length - 1; j++) {
                    if (fun1.table[j + 1] - fun2.table[j + 1] === 0) {
                        this.intersections.push(fun1.index_to_x(j));
                        this.intersections.push(fun1.table[j]);
                    }
                    else if (sign(fun1.table[j] - fun2.table[j]) !== sign(fun1.table[j + 1] - fun2.table[j + 1])) {
                        this.intersections.push(fun1.index_to_x(j));
                        this.intersections.push(fun1.table[j]);
                    }
                }
            }
        }
        this.main_buf.ctx.beginPath();
        this.main_buf.ctx.stroke();
    }
    optimize_intersection(fun1, fun2, min_x, max_x, it) {
        const y = [];
        while (it > 0) {
            const delta = max_x - min_x;
            const dx = delta * (1 / 5);
            const mid = (min_x + max_x) * (1 / 2);
            const ly1 = fun1.compiled(min_x + dx, fun1.dx);
            const hy1 = fun1.compiled(max_x - dx, fun1.dx);
            const ly2 = fun2.compiled(min_x + dx, fun2.dx);
            const hy2 = fun2.compiled(max_x - dx, fun2.dx);
            if (Math.abs(ly1 - ly2) < Math.abs(hy1 - hy2))
                max_x = mid;
            else
                min_x = mid;
            it--;
        }
        return (min_x + max_x) / 2;
    }
    render_axises(canvas, ctx, x, y, width, height) {
        //setup variables for rendering
        const font_size = 20;
        const screen_space_x_axis = -this.y_min >= 0 && -this.y_max <= 0 ? (0 - this.y_min) / this.deltaY * this.cell_dim[1] : -this.y_min < 0 ? 0 : this.main_buf.height;
        let screen_space_y_axis = -this.x_min >= 0 && -this.x_max <= 0 ? (0 - this.x_min) / this.deltaX * this.cell_dim[0] : -this.x_min < 0 ? 0 : this.main_buf.width;
        if (this.draw_axises) {
            //clear previous image
            this.axises.ctx.clearRect(0, 0, this.cell_dim[0], this.cell_dim[1]);
            //render axises
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
            //finish rendering axises
            ctx.stroke();
        }
        if (!this.draw_axis_labels) {
            this.axises.ctx.stroke();
            ctx.drawImage(this.axises.image, x, y, width, height);
            return;
        }
        const msd_x = Math.pow(10, Math.floor(-Math.log10(this.deltaX)));
        const delta_x = Math.floor(this.deltaX * msd_x * 10) / (msd_x * 100);
        let closest_start_x = Math.ceil(this.x_min * msd_x * 100) / (msd_x * 100);
        closest_start_x -= closest_start_x % delta_x;
        const msd_y = Math.pow(10, Math.ceil(-Math.log10(this.deltaY)));
        const delta_y = Math.floor(this.deltaY * msd_y * 10) / (msd_y * 100);
        let closest_start_y = Math.ceil(this.y_min * msd_y * 10) / (msd_y * 10);
        closest_start_y -= closest_start_y % delta_y;
        //calculate a starting x position
        let i = closest_start_x;
        let last_render_x = -1;
        let last_render_text_width = 0;
        ctx.font = `${font_size}px Helvetica`;
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3;
        //render points along x axis
        while (i < this.x_max) {
            const screen_x = ((i - this.x_min) / this.deltaX) * this.main_buf.width;
            ctx.strokeRect(screen_x - 3, screen_space_x_axis - 3, 6, 6);
            ctx.fillRect(screen_x - 3, screen_space_x_axis - 3, 6, 6);
            {
                const screen_x = ((i + delta_x / 2 - this.x_min) / this.deltaX) * this.main_buf.width;
                ctx.strokeRect(screen_x - 3, screen_space_x_axis - 3, 6, 6);
                ctx.fillRect(screen_x - 3, screen_space_x_axis - 3, 6, 6);
            }
            if (screen_x > last_render_x + last_render_text_width + 10 && Math.abs(i) >= delta_x * 15 / 16) {
                last_render_x = screen_x + 3;
                const text = this.format_number(i);
                const text_width = ctx.measureText(text).width;
                last_render_text_width = text_width;
                let text_y = screen_space_x_axis;
                if (text_y - font_size < 0) {
                    text_y += font_size + 10;
                }
                ctx.strokeText(text, screen_x + 3, text_y - 6);
                ctx.fillText(text, screen_x + 3, text_y - 6);
            }
            i += delta_x;
        }
        //calculate a starting y position
        i = closest_start_y;
        let last_render_y = -font_size;
        const old_screen_space_y_axis = screen_space_y_axis;
        //render points along y axis
        while (i <= this.y_max) {
            const screen_y = (i - this.y_min) / this.deltaY * this.main_buf.height;
            screen_space_y_axis = old_screen_space_y_axis;
            ctx.strokeRect(old_screen_space_y_axis - 3, screen_y - 3, 6, 6);
            ctx.fillRect(old_screen_space_y_axis - 3, screen_y - 3, 6, 6);
            {
                const screen_y = (i + delta_y / 2 - this.y_min) / this.deltaY * this.main_buf.height;
                screen_space_y_axis = old_screen_space_y_axis;
                ctx.strokeRect(old_screen_space_y_axis - 3, screen_y - 3, 6, 6);
                ctx.fillRect(old_screen_space_y_axis - 3, screen_y - 3, 6, 6);
            }
            if (screen_y > last_render_y + font_size * 2) {
                last_render_y = screen_y;
                const text = Math.abs(i) >= delta_y / 16 ? this.format_number(-i) : 0 + "";
                const text_width = ctx.measureText(text).width;
                if (screen_space_y_axis + text_width > this.main_buf.width) {
                    screen_space_y_axis -= text_width + 10;
                }
                ctx.strokeText(text, screen_space_y_axis + 3, screen_y - 4);
                ctx.fillText(text, screen_space_y_axis + 3, screen_y - 4);
            }
            i += delta_y;
        }
        this.axises.ctx.stroke();
        ctx.drawImage(this.axises.image, x, y, width, height);
    }
    draw(canvas, ctx, x, y, width, height) {
        const font_size = 24;
        if (+ctx.font.split("px")[0] != font_size) {
            ctx.font = `${font_size}px Helvetica`;
        }
        if (this.repaint) {
            this.main_buf.ctx.imageSmoothingEnabled = false;
            this.main_buf.ctx.clearRect(0, 0, this.main_buf.width, this.main_buf.height);
            this.repaint = false;
            this.try_render_functions();
            this.render_axises(this.main_buf.image, this.main_buf.ctx, x, y, this.main_buf.width, this.main_buf.height);
        }
        ctx.drawImage(this.main_buf.image, x, y);
        //this state manager controls what labels get rendered
        if (this.draw_point_labels)
            this.state_manager_grid.draw(ctx, canvas, x, y, width, height);
        if (!this.multi_touchListener.registeredMultiTouchEvent) {
            if (this.ui_alpha !== 1)
                ctx.globalAlpha = this.ui_alpha;
            this.guiManager.draw(ctx);
            this.layer_manager.list.pos[0] = this.guiManager.x;
            this.layer_manager.list.pos[1] = this.guiManager.y;
            this.options_gui_manager.draw(ctx);
            if (this.ui_alpha !== 1)
                ctx.globalAlpha = 1;
        }
    }
    render_labels_floating(ctx) {
        const selected_function = this.functions[this.layer_manager.list.selected()];
        this.render_labels_table(ctx, 0, (x) => {
            return x;
        }, (lower_bound, upper_bound, iterations) => {
            const x = (lower_bound + upper_bound) / 2;
            return [x, selected_function.call(x)];
        });
    }
    render_labels_zeros(ctx) {
        const selected_function = this.functions[this.layer_manager.list.selected()];
        this.render_labels_table(ctx, 0, (x) => {
            const index = selected_function.closest_zero(x);
            if (index !== null)
                return selected_function.zeros[index];
            return -1;
        }, (lower_bound, upper_bound, iterations) => {
            const optimized_x = selected_function.optimize_zero(lower_bound, upper_bound, iterations);
            return [optimized_x, selected_function.call(optimized_x)];
        });
    }
    render_labels_table(ctx, offset_y, closest_in_array, optimization_function) {
        const touchPos = this.touchListener.touchPos;
        const screen_space_x_axis = -this.y_min >= 0 && -this.y_max <= 0 ? (0 - this.y_min) / this.deltaY * this.cell_dim[1] : -this.y_min < 0 ? 0 : this.main_buf.height;
        let screen_space_y_axis = -this.x_min >= 0 && -this.x_max <= 0 ? (0 - this.x_min) / this.deltaX * this.cell_dim[0] : -this.x_min < 0 ? 0 : this.main_buf.width;
        let world_y = 0;
        let world_x = 0;
        const selected_function = this.functions[this.layer_manager.list.selected()];
        if (selected_function && this.layer_manager.list.selectedItem()?.checkBox.checked) {
            const touch_world_x = selected_function.x_min + touchPos[0] / this.main_buf.width * this.deltaX;
            const closest = closest_in_array(touch_world_x);
            if (closest !== -1) {
                world_x = closest;
                const optimized_point = optimization_function(world_x - selected_function.dx, world_x + selected_function.dx, 128);
                world_x = optimized_point[0];
                world_y = optimized_point[1];
            }
            if (closest !== -1) {
                this.render_formatted_point(ctx, world_x, world_y, this.world_x_to_screen(world_x), this.world_y_to_screen(world_y), 2, -1 * +ctx.font.split("px")[0] + offset_y);
                const sx = (world_x - this.x_min) / this.deltaX * this.main_buf.width;
                ctx.beginPath();
                const y = ((-world_y - this.y_min) / this.deltaY) * this.height;
                ctx.moveTo(screen_space_y_axis, y);
                ctx.lineTo(sx, y);
                ctx.moveTo(sx, screen_space_x_axis);
                ctx.lineTo(sx, y);
                ctx.stroke();
            }
        }
    }
    render_labels_max(ctx) {
        const touchPos = this.touchListener.touchPos;
        const selected_function = this.functions[this.layer_manager.list.selected()];
        this.render_labels_table(ctx, -0, (x) => {
            const index = selected_function.closest_max(x);
            if (index !== null)
                return selected_function.local_maxima[index];
            return -1;
        }, (lower_bound, upper_bound, iterations) => {
            const optimized_x = selected_function.optimize_xmax(lower_bound, upper_bound, iterations);
            return [optimized_x, selected_function.call(optimized_x)];
        });
    }
    render_labels_poi(ctx) {
        const touchPos = this.touchListener.touchPos;
        const selected_function = this.functions[this.layer_manager.list.selected()];
        this.render_labels_table(ctx, 0, (x) => {
            const index = selected_function.closest_poi(x);
            if (index !== null)
                return selected_function.points_of_inflection[index];
            return -1;
        }, (lower_bound, upper_bound, iterations) => {
            const optimized_x = selected_function.optimize_poi(lower_bound, upper_bound, iterations);
            return [optimized_x, selected_function.call(optimized_x)];
        });
    }
    closest_intersection(x) {
        if (this.intersections.length > 0) {
            let closest_intersection = 0;
            let dist = Math.abs(x - this.intersections[closest_intersection]);
            for (let i = 2; i < this.intersections.length; i += 2) {
                const xi = this.intersections[i];
                const dist_xi = Math.abs(x - xi);
                if (dist > dist_xi) {
                    dist = dist_xi;
                    closest_intersection = i;
                }
            }
            return closest_intersection;
        }
        return null;
    }
    render_labels_intersection(ctx) {
        const selected_function = this.functions[this.layer_manager.list.selected()];
        if (!this.functions[this.last_selected_item])
            return;
        this.render_labels_table(ctx, 0, (x) => {
            const index = this.closest_intersection(x);
            if (index !== null)
                return this.intersections[index];
            return -1;
        }, (lower_bound, upper_bound, iterations) => {
            const optimized_x = this.optimize_intersection(selected_function, this.functions[this.last_selected_item], lower_bound, upper_bound, iterations);
            return [optimized_x, selected_function.call(optimized_x)];
        });
    }
    render_labels_min(ctx) {
        const selected_function = this.functions[this.layer_manager.list.selected()];
        this.render_labels_table(ctx, 0, (x) => {
            const index = selected_function.closest_min(x);
            if (index !== null)
                return selected_function.local_minima[index];
            return -1;
        }, (lower_bound, upper_bound, iterations) => {
            const optimized_x = selected_function.optimize_xmin(lower_bound, upper_bound, iterations);
            return [optimized_x, selected_function.call(optimized_x)];
        });
    }
    world_x_to_screen(x) {
        return (x - this.x_min) / this.deltaX * this.main_buf.width;
    }
    world_y_to_screen(y) {
        return (-y - this.y_min) / this.deltaY * this.main_buf.height;
    }
    auto_round_world_x(x) {
        const logarithm = Math.log10(Math.abs(x));
        const rounded = Math.round(x * (Math.pow(1, -logarithm) * 100)) * Math.floor(Math.pow(1, logarithm)) / 100;
        return rounded;
    }
    round(value, places) {
        return +("" + Math.round(value * Math.pow(10, places)) * Math.pow(10, -places)).substring(0, places + 1);
    }
    render_x_y_label_screen_space(ctx, touchPos, precision = 2) {
        const world_x = ((touchPos[0] / this.width) * this.deltaX + this.x_min);
        const world_y = ((touchPos[1] / this.height) * this.deltaY + this.y_min);
        this.render_formatted_point(ctx, world_x, -world_y, touchPos[0], touchPos[1], precision);
    }
    render_x_y_label_world_space(ctx, world_x, world_y, precision = 1, offset_y = 0) {
        const screen_x = ((world_x - this.x_min) / this.deltaX) * this.width;
        const screen_y = clamp(((-world_y - this.y_min) / this.deltaY) * this.height, 30, this.height);
        this.render_formatted_point(ctx, world_x, world_y, screen_x, screen_y, precision, offset_y);
    }
    render_formatted_point(ctx, world_x, world_y, screen_x, screen_y, precision = 2, offset_y = 0) {
        const dim = 7;
        ctx.fillRect(screen_x - dim / 2, screen_y - dim / 2, dim, dim);
        ctx.strokeRect(screen_x - dim / 2, screen_y - dim / 2, dim, dim);
        let text;
        const decimal = Math.abs(world_x) < 1 << 16 && Math.abs(world_x) > Math.pow(2, -20) || Math.abs(world_x) < Math.pow(2, -35);
        text = `x: ${decimal ? round_with_precision(world_x, precision + 2) : world_x.toExponential(precision)} y: ${decimal ? round_with_precision(world_y, precision + 2) : world_y.toExponential(precision)}`;
        const text_width = ctx.measureText(text).width;
        const font_size = +ctx.font.split('px')[0];
        if (text_width + screen_x + dim > this.width) {
            screen_x -= text_width + dim * 2;
            screen_y += 3;
        }
        //add bounding to labels to prevent rendering off screen
        if (text_width + screen_x > this.main_buf.width)
            screen_x = this.main_buf.width - text_width - 10;
        else if (screen_x < 0)
            screen_x = 5;
        if (screen_y - font_size < 0)
            screen_y = font_size + 10;
        else if (screen_y > this.main_buf.height)
            screen_y = this.main_buf.height - font_size;
        ctx.fillStyle = "#000000";
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3;
        ctx.strokeText(text, screen_x + dim, screen_y + dim / 2 + offset_y);
        ctx.fillText(text, screen_x + dim, screen_y + dim / 2 + offset_y);
        ctx.lineWidth = 1;
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#000000";
    }
    format_number(value, precision = 2) {
        const dim = 10;
        let text;
        if (Math.abs(value) < 1 << 16 && Math.abs(value) > 0.0001)
            text = `${round_with_precision(value, precision + 2)}`;
        else
            text = `${value.toExponential(precision)}`;
        return text;
    }
    cell_dist(cell1, cell2) {
        const c1x = cell1 % this.cell_dim[0];
        const c1y = Math.floor(cell1 / this.cell_dim[0]);
        const c2x = cell2 % this.cell_dim[0];
        const c2y = Math.floor(cell2 / this.cell_dim[0]);
        //return (Math.abs(c1x - c2x) + Math.abs(c1y - c2y));
        return Math.sqrt(Math.pow(c1x - c2x, 2) + Math.pow(c1y - c2y, 2));
    }
    column(cell) {
        return cell % this.cell_dim[0];
    }
    row(cell) {
        return Math.floor(cell / this.cell_dim[0]);
    }
    screen_to_index(x, y) {
        const x_scale = 1 / this.width * this.cell_dim[0];
        const y_scale = 1 / this.height * this.cell_dim[1];
        x *= x_scale;
        y *= y_scale;
        return Math.floor(x) + Math.floor(y) * this.cell_dim[0];
    }
    screen_to_world(coords) {
        return [Math.floor(coords[0] / this.main_buf.width * this.deltaX + this.x_min),
            Math.floor(coords[1] / this.main_buf.height * this.deltaY + this.y_min)];
    }
    fill(start, color_p) {
        this.traverse_df(start, (index, color) => color_p, (index, color) => color == this.background_color.color);
    }
    traverse_df(start, apply, verifier) {
        const view = new Int32Array(this.main_buf.imageData.data.buffer);
        const checked_map = new Int32Array(view.length);
        checked_map.fill(0, 0, checked_map.length);
        const stack = [];
        stack.push(start);
        while (stack.length > 0) {
            const current = stack.pop();
            if (!checked_map[current] && verifier(current, view[current])) {
                checked_map[current] = 1;
                view[current] = apply(current, view[current]);
                if (checked_map[current + 1] === 0 && this.row(current + 1) === this.row(current) && view[current + 1] !== undefined) {
                    stack.push(current + 1);
                }
                if (checked_map[current - 1] === 0 && this.row(current - 1) === this.row(current) && view[current - 1] !== undefined) {
                    stack.push(current - 1);
                }
                if (checked_map[current + this.cell_dim[0]] === 0 && this.column(current + this.cell_dim[0]) === this.column(current) && view[current + this.cell_dim[0]] !== undefined) {
                    stack.push(current + this.cell_dim[0]);
                }
                if (checked_map[current - this.cell_dim[0]] === 0 && this.column(current - this.cell_dim[0]) === this.column(current) && view[current - this.cell_dim[0]] !== undefined) {
                    stack.push(current - this.cell_dim[0]);
                }
            }
        }
    }
    update_state(delta_time) {
        //update selected item
        if (this.layer_manager.list.selected() !== this.selected_item) {
            this.last_selected_item = this.selected_item;
            this.selected_item = this.layer_manager.list.selected();
        }
        const ms_to_fade = 250;
        //call transition function on state machine managing what points we are rendering
        this.state_manager_grid.transition(delta_time);
        if (this.multi_touchListener.registeredMultiTouchEvent) {
            this.ui_alpha = 0;
            return;
        }
        if (this.touchListener.registeredTouch)
            return;
        if (this.touchListener.touchPos[0] < this.options_gui_manager.x + this.options_gui_manager.width())
            this.ui_alpha += delta_time / ms_to_fade;
        else
            this.ui_alpha -= delta_time / ms_to_fade;
        this.ui_alpha = clamp(this.ui_alpha, 0, 1);
    }
    set_scale(new_scale) {
        this.scale = new_scale;
    }
}
;
const keyboardHandler = new KeyboardHandler();
async function main() {
    const canvas = document.getElementById("screen");
    const touchListener = new SingleTouchListener(canvas, true, true, false);
    canvas.onmousemove = (event) => {
    };
    const power_of_2_bounds = 300;
    canvas.addEventListener("wheel", (e) => {
        if (e.deltaY > 10000)
            return;
        const normalized_delta = (e.deltaY + 1) / getHeight();
        const multiplier = 100;
        const scaler = game.scale / 100;
        game.scale -= normalized_delta * multiplier * scaler;
        const new_scale = clamp(game.scale, Math.pow(2, -power_of_2_bounds), Math.pow(2, power_of_2_bounds));
        game.set_scale(new_scale);
        game.repaint = true;
        e.preventDefault();
    });
    canvas.width = getWidth();
    canvas.height = getHeight();
    canvas.style.cursor = "pointer";
    let counter = 0;
    const touchScreen = isTouchSupported();
    const multi_touch_listener = new MultiTouchListener(canvas);
    multi_touch_listener.registerCallBack("pinchIn", () => true, (event) => {
        const normalized_delta = event.delta / Math.max(getHeight(), getWidth());
        const scaler = game.scale / 10;
        game.scale += scaler * Math.abs(normalized_delta) * 100;
        const new_scale = clamp(game.scale, Math.pow(2, -power_of_2_bounds), Math.pow(2, power_of_2_bounds));
        game.set_scale(new_scale);
        game.repaint = true;
        event.preventDefault();
    });
    multi_touch_listener.registerCallBack("pinchOut", () => true, (event) => {
        const normalized_delta = event.delta / Math.max(getHeight(), getWidth());
        const scaler = game.scale / 10;
        game.scale -= scaler * Math.abs(normalized_delta) * 100;
        const new_scale = clamp(game.scale, Math.pow(2, -power_of_2_bounds), Math.pow(2, power_of_2_bounds));
        game.set_scale(new_scale);
        game.repaint = true;
        event.preventDefault();
    });
    let height = getHeight();
    let width = getWidth();
    let game = new Game(multi_touch_listener, touchListener, 0, 0, height, width);
    window.game = game;
    let low_fps = true;
    let draw = false;
    touchListener.registerCallBack("touchstart", (event) => game.ui_alpha >= 0.99, (event) => {
        game.guiManager.handleTouchEvents("touchstart", event);
        game.options_gui_manager.handleTouchEvents("touchstart", event);
    });
    touchListener.registerCallBack("touchend", (event) => game.ui_alpha >= 0.99, (event) => {
        game.guiManager.handleTouchEvents("touchend", event);
        game.options_gui_manager.handleTouchEvents("touchend", event);
    });
    touchListener.registerCallBack("touchmove", (event) => true, (event) => {
        let scaler_x = game.deltaX / (game.width);
        let scaler_y = game.deltaY / (game.height);
        game.y_translation -= game.scaling_multiplier * scaler_y * (event.deltaY);
        game.x_translation -= game.scaling_multiplier * scaler_x * (event.deltaX);
        if (game.ui_alpha >= 0.99) {
            game.guiManager.handleTouchEvents("touchmove", event);
            game.options_gui_manager.handleTouchEvents("touchmove", event);
        }
        game.repaint = true;
    });
    keyboardHandler.registerCallBack("keyup", () => true, (event) => {
        game.guiManager.handleKeyBoardEvents("keyup", event);
        game.options_gui_manager.handleKeyBoardEvents("keyup", event);
    });
    keyboardHandler.registerCallBack("keydown", () => true, (event) => {
        if (!keyboardHandler.keysHeld["MetaLeft"] && !keyboardHandler.keysHeld["ControlLeft"] &&
            !keyboardHandler.keysHeld["MetaRight"] && !keyboardHandler.keysHeld["ControlRight"])
            event.preventDefault();
        game.guiManager.handleKeyBoardEvents("keydown", event);
        game.options_gui_manager.handleKeyBoardEvents("keydown", event);
        game.repaint = true;
        let scaler_x = game.deltaX / (game.width);
        let scaler_y = game.deltaY / (game.height);
        switch (event.code) {
            case ("ArrowUp"):
                break;
            case ("ArrowDown"):
                break;
            case ("ArrowLeft"):
                break;
            case ("ArrowRight"):
                break;
        }
    });
    let maybectx = canvas.getContext("2d");
    if (!maybectx)
        return;
    const ctx = maybectx;
    let start = Date.now();
    let dt = 1;
    const ostart = Date.now();
    let frame_count = 0;
    let instantaneous_fps = 0;
    const time_queue = new FixedSizeQueue(60 * 2);
    const header = document.getElementById("header");
    srand(Math.random() * max_32_bit_signed);
    const drawLoop = () => {
        frame_count++;
        //do stuff and render here
        if (getWidth() !== width || getHeight() !== height) {
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
        for (let i = 0; i < time_queue.length; i++) {
            const value = time_queue.get(i);
            sum += value;
            if (highest < value) {
                highest = value;
            }
        }
        game.update_state(dt);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        game.draw(canvas, ctx, game.x, game.y, game.width, game.height);
        if (frame_count % 10 === 0)
            instantaneous_fps = Math.floor(1000 / (low_fps ? highest : dt));
        let text = "";
        ctx.fillStyle = "#FFFFFF";
        text = `avg fps: ${Math.floor(1000 * time_queue.length / sum)}, ${low_fps ? "low" : "ins"} fps: ${instantaneous_fps}`;
        const text_width = ctx.measureText(text).width;
        ctx.strokeText(text, game.width - text_width - 10, menu_font_size());
        ctx.fillText(text, game.width - text_width - 10, menu_font_size());
        requestAnimationFrame(drawLoop);
    };
    drawLoop();
}
main();
