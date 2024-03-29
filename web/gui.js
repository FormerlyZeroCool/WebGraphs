import { distance2d_arr } from './game_utils.js';
import { isTouchSupported, fetchImage } from './io.js';
import { clamp, max_32_bit_signed } from './utils.js';
{
    const fontName = "Minecraft";
    const font = new FontFace(`${fontName}`, 'url(/web/fonts/Minecraft.ttf)');
    font.load().then((loaded_face) => {
        document.fonts.add(loaded_face);
    });
}
export function blendAlphaCopy(color0, color) {
    const alphant = color0.alphaNormal();
    const alphanc = color.alphaNormal();
    const a = (1 - alphanc);
    const a0 = (alphanc + alphant * a);
    const a1 = 1 / a0;
    color0.color = (((alphanc * color.red() + alphant * color0.red() * a) * a1)) |
        (((alphanc * color.green() + alphant * color0.green() * a) * a1) << 8) |
        (((alphanc * color.blue() + alphant * color0.blue() * a) * a1) << 16) |
        ((a0 * 255) << 24);
    /*this.setRed  ((alphanc*color.red() +   alphant*this.red() * a ) *a1);
    this.setBlue ((alphanc*color.blue() +  alphant*this.blue() * a) *a1);
    this.setGreen((alphanc*color.green() + alphant*this.green() * a)*a1);
    this.setAlpha(a0*255);*/
}
export class RGB {
    constructor(r = 0, g = 0, b, a = 0) {
        this.color = 0;
        this.color = a << 24 | b << 16 | g << 8 | r;
    }
    blendAlphaCopy(color) {
        blendAlphaCopy(this, color);
    }
    toHSL() {
        const normRed = this.red() / 255;
        const normGreen = this.green() / 255;
        const normBlue = this.blue() / 255;
        const cMax = Math.max(normBlue, normGreen, normRed);
        const cMin = Math.min(normBlue, normGreen, normRed);
        const delta = cMax - cMin;
        let hue = 0;
        if (delta !== 0) {
            if (cMax === normRed) {
                hue = 60 * ((normGreen - normBlue) / delta % 6);
            }
            else if (cMax === normGreen) {
                hue = 60 * ((normBlue - normRed) / delta + 2);
            }
            else {
                hue = 60 * ((normRed - normGreen) / delta + 4);
            }
        }
        const lightness = (cMax + cMin) / 2;
        const saturation = delta / (1 - Math.abs(2 * lightness - 1));
        return [hue, saturation, lightness];
    }
    setByHSL(hue, saturation, lightness) {
        const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
        const x = c * (1 - Math.abs(hue / 60 % 2 - 1));
        const m = lightness - c / 2;
        if (hue < 60) {
            this.setRed((c + m) * 255);
            this.setGreen((x + m) * 255);
            this.setBlue(0);
        }
        else if (hue < 120) {
            this.setRed((x + m) * 255);
            this.setGreen((c + m) * 255);
            this.setBlue(m * 255);
        }
        else if (hue < 180) {
            this.setRed(m * 255);
            this.setGreen((c + m) * 255);
            this.setBlue((x + m) * 255);
        }
        else if (hue < 240) {
            this.setRed(0);
            this.setGreen((x + m) * 255);
            this.setBlue((c + m) * 255);
        }
        else if (hue < 300) {
            this.setRed((x + m) * 255);
            this.setGreen(m * 255);
            this.setBlue((c + m) * 255);
        }
        else {
            this.setRed((c + m) * 255);
            this.setGreen(m * 255);
            this.setBlue((x + m) * 255);
        }
        this.setAlpha(255);
    }
    compare(color) {
        return color && this.color === color.color;
    }
    copy(color) {
        this.color = color.color;
    }
    toInt() {
        return this.color;
    }
    toRGBA() {
        return [this.red(), this.green(), this.blue(), this.alpha()];
    }
    alpha() {
        return (this.color >> 24) & ((1 << 8) - 1);
    }
    blue() {
        return (this.color >> 16) & ((1 << 8) - 1);
    }
    green() {
        return (this.color >> 8) & ((1 << 8) - 1);
    }
    red() {
        return (this.color) & ((1 << 8) - 1);
    }
    alphaNormal() {
        return Math.round((((this.color >> 24) & ((1 << 8) - 1)) / 255) * 100) / 100;
    }
    setAlpha(red) {
        this.color &= (1 << 24) - 1;
        this.color |= red << 24;
    }
    setBlue(green) {
        this.color &= ((1 << 16) - 1) | (((1 << 8) - 1) << 24);
        this.color |= green << 16;
    }
    setGreen(blue) {
        this.color &= ((1 << 8) - 1) | (((1 << 16) - 1) << 16);
        this.color |= blue << 8;
    }
    setRed(alpha) {
        this.color &= (((1 << 24) - 1) << 8);
        this.color |= alpha;
    }
    loadString(color) {
        try {
            let r;
            let g;
            let b;
            let a;
            if (color.substring(0, 4).toLowerCase() !== "rgba") {
                if (color[0] !== "#")
                    throw new Error("Exception malformed color: " + color);
                r = parseInt(color.substring(1, 3), 16);
                g = parseInt(color.substring(3, 5), 16);
                b = parseInt(color.substring(5, 7), 16);
                a = parseFloat(color.substring(7, 9)) * 255;
            }
            else {
                const vals = color.split(",");
                vals[0] = vals[0].split("(")[1];
                vals[3] = vals[3].split(")")[0];
                r = parseInt(vals[0], 10);
                g = parseInt(vals[1], 10);
                b = parseInt(vals[2], 10);
                a = parseFloat(vals[3]) * 255;
            }
            let invalid = 0;
            if (!isNaN(r) && r >= 0) {
                if (r > 255) {
                    this.setRed(255);
                    invalid = 2;
                }
                else
                    this.setRed(r);
            }
            else
                invalid = +(r > 0);
            if (!isNaN(g) && g >= 0) {
                if (g > 255) {
                    this.setGreen(255);
                    invalid = 2;
                }
                else
                    this.setGreen(g);
            }
            else
                invalid = +(g > 0);
            if (!isNaN(b) && b >= 0) {
                if (b > 255) {
                    this.setBlue(255);
                    invalid = 2;
                }
                else
                    this.setBlue(b);
            }
            else
                invalid = +(b > 0);
            if (!isNaN(a) && a >= 0) {
                if (a > 255) {
                    this.setAlpha(255);
                    invalid = 2;
                }
                else
                    this.setAlpha(a);
            }
            else
                invalid = +(a > 0);
            if (color[color.length - 1] !== ")")
                invalid = 1;
            let openingPresent = false;
            for (let i = 0; !openingPresent && i < color.length; i++) {
                openingPresent = color[i] === "(";
            }
            if (!openingPresent)
                invalid = 1;
            return invalid;
        }
        catch (error) {
            console.log(error);
            return 0;
        }
    }
    htmlRBGA() {
        return `rgba(${this.red()}, ${this.green()}, ${this.blue()}, ${this.alphaNormal()})`;
    }
    htmlRBG() {
        const red = this.red() < 16 ? `0${this.red().toString(16)}` : this.red().toString(16);
        const green = this.green() < 16 ? `0${this.green().toString(16)}` : this.green().toString(16);
        const blue = this.blue() < 16 ? `0${this.blue().toString(16)}` : this.blue().toString(16);
        return `#${red}${green}${blue}`;
    }
}
;
export class Pair {
    constructor(first, second) {
        this.first = first;
        this.second = second;
    }
}
;
export class ImageContainer {
    constructor(imageName, imagePath, callBack = (img) => "") {
        this.image = null;
        if (imagePath && imageName)
            fetchImage(imagePath).then(img => {
                this.image = img;
                callBack(img);
            });
        this.name = imageName;
    }
    hflip() {
        if (this.image) {
            const outputImage = document.createElement('canvas');
            outputImage.width = this.image.width;
            outputImage.height = this.image.height;
            const ctx = outputImage.getContext('2d');
            ctx.scale(-1, 1);
            ctx.drawImage(this.image, -outputImage.width, 0);
            this.image = outputImage;
        }
    }
}
;
;
export class LexicoGraphicNumericPair extends Pair {
    constructor(rollOver) {
        super(0, 0);
        this.rollOver = rollOver;
    }
    incHigher(val = 1) {
        this.first += val;
        return this.first;
    }
    incLower(val = 1) {
        this.first += Math.floor((this.second + val) / this.rollOver);
        this.second = (this.second + val) % this.rollOver;
        return this.second;
    }
    hash() {
        return this.first * this.rollOver + this.second;
    }
}
;
export class RowRecord {
    constructor(x, y, width, height, element) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.element = element;
    }
}
;
;
export class StateManagedUI {
    constructor(state) {
        this.state = state;
    }
    draw(ctx, canvas, x, y, width, height) {
        this.state.draw(ctx, canvas, x, y, width, height);
    }
    handleKeyboardEvents(type, event) {
        this.state.handleKeyboardEvents(type, event);
    }
    handleTouchEvents(type, event) {
        this.state.handleTouchEvents(type, event);
    }
    transition(delta_time) {
        this.state = this.state.transition(delta_time);
    }
}
;
export class StateManagedUIElement {
    constructor() {
        this.layouts = [];
    }
    draw(ctx, canvas, x, y, width, height) {
        this.layouts.forEach(layout => layout.draw(ctx));
    }
    handleKeyboardEvents(type, event) {
        this.layouts.forEach(layout => layout.handleKeyBoardEvents(type, event));
    }
    handleTouchEvents(type, event) {
        this.layouts.forEach(layout => layout.handleTouchEvents(type, event));
    }
    transition(delta_time) {
        throw new Error("Method not implemented.");
    }
}
;
export class SimpleGridLayoutManager {
    constructor(matrixDim, pixelDim, x = 0, y = 0) {
        this.contextMenu = null;
        this.lastTouched = 0;
        this.matrixDim = matrixDim;
        this.pixelDim = pixelDim;
        this.focused = false;
        this.x = x;
        this.y = y;
        this.refreshRate = 4;
        this.frameCounter = 0;
        this.elements = [];
        this.elementsPositions = [];
        this.elementTouched = null;
    }
    createHandlers(keyboardHandler, touchHandler) {
        if (keyboardHandler) {
            keyboardHandler.registerCallBack("keydown", (e) => this.active(), (e) => { e.keyboardHandler = keyboardHandler; this.elements.forEach(el => el.handleKeyBoardEvents("keydown", e)); });
            keyboardHandler.registerCallBack("keyup", (e) => this.active(), (e) => { e.keyboardHandler = keyboardHandler; this.elements.forEach(el => el.handleKeyBoardEvents("keyup", e)); });
        }
        if (touchHandler) {
            touchHandler.registerCallBack("touchstart", (e) => this.active(), (e) => { this.handleTouchEvents("touchstart", e); });
            touchHandler.registerCallBack("touchmove", (e) => this.active(), (e) => { this.handleTouchEvents("touchmove", e); });
            touchHandler.registerCallBack("touchend", (e) => this.active(), (e) => { this.handleTouchEvents("touchend", e); });
        }
    }
    max_element_y_bounds() {
        let highest = 0;
        this.elementsPositions.forEach(el => {
            const y_bound = el.y + el.height;
            if (y_bound > highest) {
                highest = y_bound;
            }
        });
        return highest;
    }
    max_element_x_bounds() {
        let rightmost = 0;
        this.elementsPositions.forEach(el => {
            const x_bound = el.x + el.width;
            if (x_bound > rightmost) {
                rightmost = x_bound;
            }
        });
        return rightmost;
    }
    trimDim() {
        this.pixelDim = [this.max_element_x_bounds(), this.max_element_y_bounds()];
        return this;
    }
    isLayoutManager() {
        return true;
    }
    collision(touchPos) {
        return touchPos[0] >= this.x && touchPos[0] <= this.x + this.width() &&
            touchPos[1] >= this.y && touchPos[1] <= this.y + this.height();
    }
    collision_shifted(touchPos) {
        return touchPos[0] >= 0 && touchPos[0] < 0 + this.width() &&
            touchPos[1] >= 0 && touchPos[1] < 0 + this.height();
    }
    handleKeyBoardEvents(type, e) {
        this.elements.forEach(el => el.handleKeyBoardEvents(type, e));
        if (e.repaint) {
            this.refreshCanvas();
        }
    }
    handleElementTouchEvents(record, type, e) {
        if (record.element.isLayoutManager())
            record.element.handleTouchEvents(type, e, true);
        else
            record.element.handleTouchEvents(type, e);
    }
    handleElementTouchEventsHigh(record, type, e, original_touch_pos, from_parent_handler) {
        //only adjust with x and y is this is root layout manager
        const dx = record.x + (from_parent_handler ? 0 : this.x);
        const dy = record.y + (from_parent_handler ? 0 : this.y);
        e.translateEvent(e, -dx, -dy);
        if (type !== "hover") {
            if (type !== "touchmove")
                record.element.activate();
            else if (this.elementTouched !== null)
                this.elementTouched.element.activate();
        }
        if (!from_parent_handler) {
            try {
                this.handleElementTouchEvents(record, type, e);
            }
            catch (maybe_context_menu) {
                if ("draw" in maybe_context_menu &&
                    "handleTouchEvents" in maybe_context_menu &&
                    "width" in maybe_context_menu &&
                    "height" in maybe_context_menu) {
                    const element = maybe_context_menu;
                    this.contextMenu = new RowRecord(original_touch_pos[0], original_touch_pos[1], element.width(), element.height(), element);
                    element.x = original_touch_pos[0];
                    element.y = original_touch_pos[1];
                }
                else
                    throw maybe_context_menu;
            }
        }
        else
            this.handleElementTouchEvents(record, type, e);
        e.translateEvent(e, dx, dy);
    }
    getRecord(e, from_parent_handler, manage_activation = true) {
        let record = null;
        let index = 0;
        if (!from_parent_handler)
            e.translateEvent(e, -this.x, -this.y);
        let runningNumber = 0;
        this.elementsPositions.forEach(el => {
            if (manage_activation) {
                el.element.deactivate();
                el.element.refresh();
            }
            if (e.touchPos[0] >= el.x && e.touchPos[0] < el.x + el.element.width() &&
                e.touchPos[1] >= el.y && e.touchPos[1] < el.y + el.element.height()) {
                record = el;
                index = runningNumber;
            }
            runningNumber++;
        });
        if (record && manage_activation) {
            record.element.activate();
        }
        if (!from_parent_handler)
            e.translateEvent(e, this.x, this.y);
        return record;
    }
    handleTouchEvents(type, e, from_parent_handler = false) {
        //console.log(type, this)
        const original_touch_pos = [e.touchPos[0], e.touchPos[1]];
        const context = this.contextMenu;
        if (context && type === "touchstart") {
            this.contextMenu = null;
            context.element.handleTouchEvents("touchstart", e);
            context.element.handleTouchEvents("touchend", e);
        }
        else if (context && type === "hover") {
            context.element.handleTouchEvents("hover", e);
        }
        if (type === "hover") {
            if ((!this.elementTouched && from_parent_handler && e.touchPos[0] <= this.width() && e.touchPos[1] <= this.height()) || !this.elementTouched && e.touchPos[0] >= this.x && e.touchPos[0] < this.x + this.width() &&
                e.touchPos[1] >= this.y && e.touchPos[1] < this.y + this.height()) {
                const record = this.getRecord(e, from_parent_handler, false);
                if (record)
                    record.element.handleTouchEvents(type, e);
            }
        }
        else if ((!this.elementTouched && from_parent_handler && e.touchPos[0] <= this.width() && e.touchPos[1] <= this.height()) || !this.elementTouched && e.touchPos[0] >= this.x && e.touchPos[0] < this.x + this.width() &&
            e.touchPos[1] >= this.y && e.touchPos[1] < this.y + this.height()) {
            const record = this.getRecord(e, from_parent_handler);
            //console.log(record)
            if (record) {
                e.preventDefault();
                this.handleElementTouchEventsHigh(record, type, e, original_touch_pos, from_parent_handler);
                record.element.refresh();
                this.elementTouched = record;
                if (e.repaint) {
                    this.refreshCanvas();
                }
                this.lastTouched = this.elements.indexOf(record.element);
            }
        }
        else if (this.elementTouched) {
            const record = this.elementTouched;
            this.handleElementTouchEventsHigh(record, type, e, original_touch_pos, from_parent_handler);
        }
        if (type === "touchend")
            this.elementTouched = null;
    }
    refresh() {
        this.refreshMetaData();
    }
    deactivate() {
        this.focused = false;
        this.elements.forEach(el => {
            el.deactivate();
        });
    }
    activate() {
        this.focused = true;
        this.elements.forEach(el => {
            //el.activate();
        });
    }
    isCellFree(x, y) {
        const pixelX = x * this.pixelDim[0] / this.matrixDim[0];
        const pixelY = y * this.pixelDim[1] / this.matrixDim[1];
        let free = true;
        if (pixelX < this.pixelDim[0] && pixelY < this.pixelDim[1])
            for (let i = 0; free && i < this.elementsPositions.length; i++) {
                const elPos = this.elementsPositions[i];
                if (elPos.x <= pixelX && elPos.x + elPos.width > pixelX &&
                    elPos.y <= pixelY && elPos.y + elPos.height > pixelY)
                    free = false;
            }
        else
            free = false;
        return free;
    }
    refreshMetaData(xPos = 0, yPos = 0, offsetX = 0, offsetY = 0) {
        this.elementsPositions.splice(0, this.elementsPositions.length);
        const width = this.columnWidth();
        const height = this.rowHeight();
        let counter = new LexicoGraphicNumericPair(this.matrixDim[0]);
        let matX = 0;
        let matY = 0;
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            const elementWidth = Math.ceil(element.width() / this.columnWidth());
            let clearSpace = true;
            do {
                let j = counter.second;
                clearSpace = true;
                for (; clearSpace && j < counter.second + elementWidth; j++) {
                    clearSpace = this.isCellFree(j, counter.first);
                }
                if (!clearSpace && j < elementWidth) {
                    counter.incLower(j - counter.second);
                }
                else if (!clearSpace && j >= elementWidth) {
                    counter.incHigher();
                    counter.second = 0;
                }
            } while (!clearSpace && counter.first < this.matrixDim[1]);
            const x = counter.second * this.columnWidth();
            const y = counter.first * this.rowHeight();
            counter.second += elementWidth;
            if (element.isLayoutManager()) {
                element.x = x + this.x;
                element.y = y + this.y;
            }
            const record = new RowRecord(x + xPos + offsetX, y + yPos + offsetY, element.width(), element.height(), element);
            this.elementsPositions.push(record);
        }
    }
    refreshCanvas() {
    }
    active() {
        return this.focused;
    }
    width() {
        return this.pixelDim[0];
    }
    setWidth(val) {
        this.pixelDim[0] = val;
    }
    height() {
        return this.pixelDim[1];
    }
    setHeight(val) {
        this.pixelDim[1] = val;
    }
    rowHeight() {
        return this.pixelDim[1] / this.matrixDim[1];
    }
    columnWidth() {
        return this.pixelDim[0] / this.matrixDim[0];
    }
    usedRows() {
        for (let i = 0; i < this.elements.length; i++) {
        }
        return this.elements.length - 1;
    }
    hasSpace(element) {
        const elWidth = Math.floor((element.width() / this.columnWidth()) * this.matrixDim[0]);
        const elHeight = Math.floor((element.height() / this.rowHeight()) * this.matrixDim[1]);
        if (this.elements.length) {
            //todo
        }
        //todo
        return false;
    }
    addElement(element, position = -1) {
        //if(!element)
        //  return false;
        let inserted = false;
        if (position === -1) {
            this.elements.push(element);
        }
        else {
            this.elements.splice(position, 0, element);
        }
        element.parent = this;
        this.refreshMetaData();
        this.refreshCanvas();
        return inserted;
    }
    removeElement(element) {
        this.elements.splice(this.elements.indexOf(element), 1);
        this.refreshMetaData();
        this.refreshCanvas();
    }
    vertical_groupify_previous(elements) {
        this.addElement(vertical_group(this.elements.splice(this.elements.length - elements, elements)));
    }
    horizontal_groupify_previous(elements) {
        this.addElement(horizontal_group(this.elements.splice(this.elements.length - elements, elements)));
    }
    elementPosition(element) {
        const elPos = this.elementsPositions.find((el) => el.element === element);
        if (elPos === undefined)
            return [-1, -1];
        return [elPos.x, elPos.y];
    }
    draw(ctx, xPos = this.x, yPos = this.y, offsetX = 0, offsetY = 0) {
        this.elementsPositions.forEach(el => el.element.draw(ctx, el.x + xPos, el.y + yPos, 0, 0));
        if (this.contextMenu) {
            const el = this.contextMenu;
            el.element.draw(ctx, el.x + xPos, el.y + yPos, 0, 0);
        }
    }
}
;
export class VerticalLayoutManager extends SimpleGridLayoutManager {
    constructor(pixelDim, x = 0, y = 0) {
        super([1, 1], pixelDim, x, y);
    }
    refreshMetaData(xPos, yPos, offsetX, offsetY) {
        this.elementsPositions.length = 0;
        let current_y = 0;
        this.elements.forEach((element) => {
            const record = new RowRecord(0, current_y, element.width(), element.height(), element);
            if (element.isLayoutManager()) {
                element.x = this.x;
                element.y = current_y + this.y;
            }
            this.elementsPositions.push(record);
            current_y += element.height();
        });
        this.pixelDim[1] = current_y;
    }
}
export class HorizontalLayoutManager extends SimpleGridLayoutManager {
    constructor(pixelDim, x = 0, y = 0) {
        super([1, 1], pixelDim, x, y);
    }
    refreshMetaData(xPos, yPos, offsetX, offsetY) {
        this.elementsPositions.length = 0;
        let current_x = 0;
        this.elements.forEach((element) => {
            if (element.isLayoutManager()) {
                element.x = current_x + this.x;
                element.y = this.y;
            }
            this.elementsPositions.push(new RowRecord(current_x, 0, element.width(), element.height(), element));
            current_x += element.width();
        });
    }
}
//tbd
export class ScrollingGridLayoutManager extends SimpleGridLayoutManager {
    constructor(matrixDim, pixelDim, x = 0, y = 0) {
        super(matrixDim, pixelDim, x, y);
        this.scrolledCanvas = document.createElement("canvas");
        this.offset = [0, 0];
    }
    handleScrollEvent(event) {
    }
    refreshCanvas() {
        super.refreshCanvas();
    }
}
;
export class ContextMenuOption {
    constructor(callback, text, width, height, font_size) {
        this.button = new GuiButton(callback, text, width, height, font_size);
    }
    active() {
        return true;
    }
    deactivate() { }
    activate() { }
    width() {
        return this.button.width();
    }
    height() {
        return this.button.height();
    }
    refresh() {
        this.button.refresh();
    }
    draw(ctx, x, y, offsetX, offsetY) {
        this.button.draw(ctx, x, y, offsetX, offsetY);
    }
    handleKeyBoardEvents(type, e) {
        this.button.handleKeyBoardEvents(type, e);
    }
    handleTouchEvents(type, e) {
        this.button.handleTouchEvents(type, e);
    }
    isLayoutManager() {
        return this.button.isLayoutManager();
    }
}
;
export class ContextMenu extends VerticalLayoutManager {
    add_option(option, text, font_name = "courier") {
        const grey = new RGB(125, 125, 125, 255);
        const height = this.height();
        this.addElement(new GuiButton(option, text, this.width(), this.height(), 16, grey, grey, font_name, new RGB(0, 0, 0, 0), GuiButton.default_text_color));
        this.elements.forEach((el) => el.dimensions[1] = height / this.elements.length);
        this.refreshMetaData();
    }
    handleTouchEvents(type, e) {
        super.handleTouchEvents(type, e, false);
        if (type === "hover" && this.collision(e.touchPos)) {
            const rec = this.getRecord(e, false, false);
            if (rec)
                this.highlighted_element = rec;
        }
    }
    draw(ctx, xPos, yPos, offsetX, offsetY) {
        super.draw(ctx, xPos, yPos, offsetX, offsetY);
        if (this.highlighted_element) {
            ctx.fillStyle = new RGB(255, 255, 255, 50).htmlRBGA();
            ctx.fillRect(this.highlighted_element.x + this.x, this.highlighted_element.y + this.y, this.highlighted_element.width, this.highlighted_element.height);
        }
    }
    options() {
        return this.elements;
    }
}
;
export class GuiListItem extends HorizontalLayoutManager {
    constructor(text, state, pixelDim, fontSize = 16, callBack = () => { }, genericCallBack = null, slideMoved = null, flags = GuiTextBox.bottom, genericTouchType = "touchend") {
        super(pixelDim);
        this.callBackType = genericTouchType;
        this.callBack = genericCallBack;
        this.checkBox = new GuiCheckBox(callBack, pixelDim[0] / 5, pixelDim[1], state);
        const width = (pixelDim[0] - this.checkBox.width()); // >> (slideMoved ? 1: 0);
        this.textBox = new GuiTextBox(true, width, null, fontSize, pixelDim[1], flags, () => true, new RGB(0, 0, 0, 0), new RGB(0, 0, 0, 0), true, "courier");
        this.textBox.setText(text);
        this.addElement(this.checkBox);
        this.addElement(this.textBox);
        if (slideMoved) {
            //this.slider = new GuiSlider(1, [width, pixelDim[1]], slideMoved);
            //this.sliderX = width + pixelDim[1];
            //this.addElement(this.slider);
        }
        else {
            this.slider = null;
            this.sliderX = -1;
        }
    }
    handleTouchEvents(type, e, from_layout_man) {
        super.handleTouchEvents(type, e, from_layout_man);
        if (this.active() && type === this.callBackType) {
            e.item = this;
            if (this.callBack)
                this.callBack(e);
        }
    }
    handleKeyBoardEvents(type, e) {
        super.handleKeyBoardEvents(type, e);
        if (this.active() && type === this.callBackType) {
            e.item = this;
            if (this.callBack)
                this.callBack(e);
        }
    }
    state() {
        return this.checkBox.checked;
    }
}
;
export class SlideEvent {
    constructor(value, element) {
        this.value = value;
        this.element = element;
    }
}
export class GuiCheckListError {
}
;
export class GuiCheckList {
    constructor(matrixDim, pixelDim, fontSize, uniqueSelection, swap = null, slideMoved = null, get_error, callback_get_non_error_background_color) {
        this.get_error = get_error;
        this.callback_get_non_error_background_color = callback_get_non_error_background_color;
        this.focused = true;
        this.uniqueSelection = uniqueSelection;
        this.fontSize = fontSize;
        this.layoutManager = new SimpleGridLayoutManager([1, matrixDim[1]], pixelDim);
        this.list = [];
        this.pos = [0, 0];
        this.limit = 0;
        this.dragItem = null;
        this.dragItemLocation = [-1, -1];
        this.dragItemInitialIndex = -1;
        this.slideMoved = slideMoved;
        this.swapElementsInParallelArray = swap;
    }
    push(text, state = true, checkBoxCallback, onClickGeneral) {
        const newElement = new GuiListItem(text, state, [this.width(),
            this.height() / this.layoutManager.matrixDim[1] - 5], this.fontSize, checkBoxCallback, onClickGeneral, this.slideMoved);
        this.list.push(newElement);
    }
    selected() {
        return this.layoutManager.lastTouched;
    }
    selectedItem() {
        if (this.selected() !== -1)
            return this.list[this.selected()];
        else
            return null;
    }
    findBasedOnCheckbox(checkBox) {
        let index = 0;
        for (; index < this.list.length; index++) {
            if (this.list[index].checkBox === checkBox)
                break;
        }
        return index;
    }
    get(index) {
        if (this.list[index])
            return this.list[index];
        else
            return null;
    }
    isChecked(index) {
        return this.list[index] ? this.list[index].checkBox.checked : false;
    }
    delete(index) {
        if (this.list[index]) {
            this.list.splice(index, 1);
            this.refresh();
        }
    }
    active() {
        return this.focused;
    }
    deactivate() {
        this.focused = false;
    }
    activate() {
        this.focused = true;
    }
    width() {
        return this.layoutManager.width();
    }
    height() {
        return this.layoutManager.height();
    }
    refresh() {
        this.layoutManager.elements = this.list;
        this.layoutManager.refresh();
    }
    draw(ctx, x, y, offsetX, offsetY) {
        //goal to switch to this
        //this.layoutManager.draw(ctx, x, y, offsetX, offsetY);
        this.pos[0] = x;
        this.pos[1] = y;
        this.layoutManager.x = x;
        this.layoutManager.y = y;
        const itemsPositions = this.layoutManager.elementsPositions;
        let offsetI = 0;
        for (let i = 0; i < itemsPositions.length; i++) {
            if (!this.list[i]) {
                console.log("Error list has invalid members should only contain gyui list items", this.list);
                continue;
            }
            if (this.dragItem && this.dragItemLocation[1] !== -1 && i === Math.floor((this.dragItemLocation[1] / this.height()) * this.layoutManager.matrixDim[1])) {
                offsetI++;
            }
            const background_color = this.callback_get_non_error_background_color(i >= this.dragItemInitialIndex && this.dragItemInitialIndex !== -1 ? i + 1 : i);
            if (background_color) {
                const alpha = background_color.alpha();
                background_color.setAlpha(190);
                ctx.fillStyle = background_color.htmlRBGA();
                background_color.setAlpha(alpha);
                ctx.fillRect(x, y + offsetI * (this.height() / this.layoutManager.matrixDim[1]), this.width(), (this.height() / this.layoutManager.matrixDim[1]) - 5);
            }
            this.list[i].draw(ctx, x, y + offsetI * (this.height() / this.layoutManager.matrixDim[1]), offsetX, offsetY);
            offsetI++;
            const row_errors = this.get_error(i);
            if (row_errors) {
                const font_size = 18;
                ctx.fillStyle = new RGB(0, 0, 0, 200).htmlRBGA();
                let error_row_offset = 2;
                ctx.fillRect(x, y + (offsetI - error_row_offset) * (this.height() / this.layoutManager.matrixDim[1]), this.width(), this.height() / this.layoutManager.matrixDim[1]);
                ctx.font = `${font_size}px Helvetica`;
                ctx.fillStyle = "#FF0000";
                ctx.strokeStyle = "#FFFFFF";
                ctx.lineWidth = 3;
                const text_width = ctx.measureText(row_errors).width;
                if (text_width <= this.width()) {
                    ctx.fillStyle = "#FF0000";
                    ctx.strokeText(row_errors, x, y + font_size + (offsetI - error_row_offset) * (this.height() / this.layoutManager.matrixDim[1]), this.width());
                    ctx.fillText(row_errors, x, y + font_size + (offsetI - error_row_offset) * (this.height() / this.layoutManager.matrixDim[1]), this.width());
                }
                else {
                    const split_index = row_errors.indexOf(' ', Math.floor(row_errors.length / 2));
                    let j = 1;
                    let split_text = row_errors.substring(0, split_index);
                    ctx.strokeText(split_text, x, y + j * font_size + (offsetI - error_row_offset) * (this.height() / this.layoutManager.matrixDim[1]), this.width());
                    ctx.fillText(split_text, x, y + j++ * font_size + (offsetI - error_row_offset) * (this.height() / this.layoutManager.matrixDim[1]), this.width());
                    split_text = row_errors.substring(split_index + 1);
                    ctx.strokeText(split_text, x, y + j * font_size + (offsetI - error_row_offset) * (this.height() / this.layoutManager.matrixDim[1]), this.width());
                    ctx.fillText(split_text, x, y + j * font_size + (offsetI - error_row_offset) * (this.height() / this.layoutManager.matrixDim[1]), this.width());
                }
                ctx.strokeStyle = "#FF0000";
                ctx.strokeRect(x, y + (offsetI - error_row_offset) * (this.height() / this.layoutManager.matrixDim[1]), this.width(), this.height() / this.layoutManager.matrixDim[1]);
                ctx.strokeRect(x, y + (offsetI - error_row_offset + 1) * (this.height() / this.layoutManager.matrixDim[1]), this.width(), this.height() / this.layoutManager.matrixDim[1] - 5);
            }
        }
        if (this.dragItem) {
            const background_color = this.callback_get_non_error_background_color(this.dragItemInitialIndex);
            if (background_color) {
                const alpha = background_color.alpha();
                background_color.setAlpha(140);
                ctx.fillStyle = background_color.htmlRBGA();
                background_color.setAlpha(alpha);
                ctx.fillRect(x + this.dragItemLocation[0] - this.dragItem.width() / 2, y + this.dragItemLocation[1] - this.dragItem.height() / 2, this.width(), (this.height() / this.layoutManager.matrixDim[1]) - 5);
            }
            this.dragItem.draw(ctx, x + this.dragItemLocation[0] - this.dragItem.width() / 2, y + this.dragItemLocation[1] - this.dragItem.height() / 2, offsetX, offsetY);
        }
    }
    handleKeyBoardEvents(type, e) {
        this.layoutManager.handleKeyBoardEvents(type, e);
    }
    handleTouchEvents(type, e) {
        if (type === "hover")
            return;
        this.layoutManager.activate();
        const clicked = Math.floor(((e.touchPos[1]) / this.height()) * this.layoutManager.matrixDim[1]);
        this.layoutManager.lastTouched = clicked > this.list.length ? this.list.length - 1 : clicked;
        const element = this.layoutManager.elementsPositions[this.layoutManager.lastTouched];
        if (element && this.layoutManager.elementsPositions[clicked] && !this.dragItem) {
            e.touchPos[1] -= clicked * (this.layoutManager.elementsPositions[clicked].height + 5);
            element.element.handleTouchEvents(type, e, true);
            e.touchPos[1] += clicked * (this.layoutManager.elementsPositions[clicked].height + 5);
        }
        this.layoutManager.deactivate();
        switch (type) {
            case ("touchstart"):
                break;
            case ("touchend"):
                if (this.dragItem) {
                    this.list.splice(clicked, 0, this.dragItem);
                    if (this.swapElementsInParallelArray && this.dragItemInitialIndex !== -1) {
                        if (clicked > this.list.length)
                            this.swapElementsInParallelArray(this.dragItemInitialIndex, this.list.length - 1);
                        else
                            this.swapElementsInParallelArray(this.dragItemInitialIndex, clicked);
                    }
                    this.dragItem = null;
                    this.dragItemInitialIndex = -1;
                    this.dragItemLocation[0] = -1;
                    this.dragItemLocation[1] = -1;
                }
                if (this.selectedItem() && this.selectedItem().callBack)
                    this.selectedItem().callBack(e);
                break;
            case ("touchmove"):
                const movesNeeded = isTouchSupported() ? 7 : 2;
                if (!this.dragItem && this.selectedItem() && e.touchPos[0] < this.width() && distance2d_arr(e.startTouchPos, e.touchPos) > this.list[0].height()) {
                    if (e.moveCount === movesNeeded && this.selectedItem() && this.list.length > 1) {
                        this.dragItem = this.list.splice(this.selected(), 1)[0];
                        this.dragItemInitialIndex = this.selected();
                        this.dragItemLocation[0] = e.touchPos[0];
                        this.dragItemLocation[1] = e.touchPos[1];
                    }
                }
                else if (this.dragItem && e.moveCount > movesNeeded) {
                    this.dragItemLocation[0] += e.deltaX;
                    this.dragItemLocation[1] += e.deltaY;
                }
                break;
        }
        let checkedIndex = -1;
        if (!this.uniqueSelection)
            return;
        for (let i = 0; i < this.list.length; i++)
            if (this.list[i].checkBox.checked)
                checkedIndex = i;
        for (let i = 0; i < this.list.length; i++) {
            if (this.list[i].checkBox.checked && i !== checkedIndex) {
                this.list[checkedIndex].checkBox.checked = false;
                this.list[checkedIndex].checkBox.refresh();
            }
        }
    }
    isLayoutManager() {
        return false;
    }
}
;
export class GuiSlider {
    constructor(state, dim, movedCallBack) {
        this.state = state;
        this.callBack = movedCallBack;
        this.focused = false;
        this.dim = [dim[0], dim[1]];
        this.refresh();
    }
    setState(value) {
        if (value < 1 && value >= 0)
            this.state = value;
        else if (value >= 1)
            this.state = value;
        this.refresh();
    }
    active() {
        return this.focused;
    }
    deactivate() {
        this.focused = false;
    }
    activate() {
        this.focused = true;
    }
    width() {
        return this.dim[0];
    }
    height() {
        return this.dim[1];
    }
    getBounds() {
        return [this.width() / 10, this.height() / 10, this.width() - this.width() / 5, this.height() - this.height() / 5];
    }
    refresh() {
    }
    draw(ctx, x, y, offsetX, offsetY) {
        ctx.fillStyle = "#FFFFFF";
        const bounds = this.getBounds();
        const center = [bounds[0] + bounds[2] / 2, bounds[1] + bounds[3] / 2];
        const displayLineX = this.state * bounds[2] + bounds[0];
        ctx.fillRect(x + bounds[0] - 1, y + center[1] - 1, bounds[2] + 2, 4);
        ctx.fillRect(x + displayLineX - 1, y + bounds[1] - 1, 5 + 1, bounds[3] + 2);
        ctx.fillStyle = "#000000";
        ctx.fillRect(x + bounds[0], y + center[1], bounds[2], 2);
        ctx.fillRect(x + displayLineX, y + bounds[1], 4, bounds[3]);
    }
    handleKeyBoardEvents(type, e) {
    }
    handleTouchEvents(type, e) {
        const bounds = [this.width() / 10, this.height() / 10, this.width() - this.width() / 5, this.height() - this.height() / 5];
        switch (type) {
            case ("touchstart"):
                this.state = (e.touchPos[0] - bounds[0]) / bounds[2];
                break;
            case ("touchmove"):
                this.state = (e.touchPos[0] - bounds[0]) / bounds[2];
                break;
        }
        if (this.state > 1)
            this.state = 1;
        else if (this.state < 0)
            this.state = 0;
        if (this.callBack && type !== "hover")
            this.callBack({ value: this.state, element: this });
        this.refresh();
    }
    isLayoutManager() {
        return false;
    }
}
;
export class CustomBackgroundSlider extends GuiSlider {
    constructor(state, dim, movedCallBack, refreshBackgroundCallBack) {
        super(state, dim, movedCallBack);
        this.refreshBackground = refreshBackgroundCallBack;
    }
    refresh() {
        super.refresh();
        if (!this.backgroundCanvas) {
            this.backgroundCanvas = document.createElement("canvas");
        }
        if (this.backgroundCanvas.width !== this.width() || this.backgroundCanvas.height !== this.height()) {
            this.backgroundCanvas.width = this.width();
            this.backgroundCanvas.height = this.height();
            this.backctx = this.backgroundCanvas.getContext("2d");
        }
        const bounds = this.getBounds();
        this.backctx.clearRect(0, 0, this.width(), this.height());
        if (this.refreshBackground)
            this.refreshBackground(this.backctx, bounds[0], bounds[1], bounds[2], bounds[3]);
    }
    draw(ctx, x, y, offsetX, offsetY) {
        ctx.drawImage(this.backgroundCanvas, x + offsetX, y + offsetY);
        super.draw(ctx, x, y, offsetX, offsetY);
    }
}
;
export class GuiSpacer {
    constructor(dim) {
        this.dim = [dim[0], dim[1]];
        this.refresh();
    }
    active() {
        return false;
    }
    deactivate() { }
    activate() { }
    width() {
        return this.dim[0];
    }
    height() {
        return this.dim[1];
    }
    refresh() { }
    draw(ctx, x, y, offsetX, offsetY) { }
    handleKeyBoardEvents(type, e) { }
    handleTouchEvents(type, e) { }
    isLayoutManager() {
        return false;
    }
}
;
export class GuiColoredSpacer {
    constructor(dim, color, onclicked = null) {
        this.dim = [dim[0], dim[1]];
        this.onclicked = onclicked;
        this.color = new RGB(0, 0, 0);
        this.color.copy(color);
        this.refresh();
    }
    active() {
        return false;
    }
    deactivate() { }
    activate() { }
    width() {
        return this.dim[0];
    }
    height() {
        return this.dim[1];
    }
    refresh() { }
    draw(ctx, x, y, offsetX, offsetY) {
        const originalFillStyle = ctx.fillStyle;
        const originalStrokeStyle = ctx.strokeStyle;
        const colorString = this.color.htmlRBGA();
        if (colorString !== originalFillStyle) {
            ctx.fillStyle = colorString;
        }
        if ("#000000" !== originalStrokeStyle) {
            ctx.strokeStyle = "#000000";
        }
        ctx.fillRect(x + offsetX, y + offsetY, this.dim[0], this.dim[1]);
        ctx.strokeRect(x + offsetX, y + offsetY, this.dim[0], this.dim[1]);
        if (colorString !== originalFillStyle) {
            ctx.fillStyle = originalFillStyle;
        }
        if ("#000000" !== originalStrokeStyle) {
            ctx.strokeStyle = originalStrokeStyle;
        }
    }
    handleKeyBoardEvents(type, e) { }
    handleTouchEvents(type, e) {
        if (this.onclicked && type !== "hover")
            this.onclicked(type, e);
    }
    isLayoutManager() {
        return false;
    }
}
;
export class GuiButton {
    constructor(callBack, text, width = 200, height = 50, fontSize = 12, pressedColor = GuiButton.default_pressedColor, unPressedColor = GuiButton.default_unPressedColor, fontName = "courier", outline_color = GuiButton.default_outline_color, text_color = GuiButton.default_text_color) {
        this.outline_color = outline_color;
        this.text_color = text_color;
        this.text = text;
        this.fontSize = fontSize;
        this.dimensions = [width, height];
        this.pressedColor = pressedColor;
        this.unPressedColor = unPressedColor;
        this.pressed = false;
        this.focused = true;
        this.callback = callBack;
        this.fontName = fontName;
    }
    handleKeyBoardEvents(type, e) {
        if (this.active()) {
            if (e.code === "Enter") {
                switch (type) {
                    case ("keydown"):
                        this.pressed = true;
                        break;
                    case ("keyup"):
                        if (this.callback)
                            this.callback();
                        this.pressed = false;
                        this.deactivate();
                        break;
                }
            }
        }
    }
    handleTouchEvents(type, e) {
        if (this.active())
            switch (type) {
                case ("touchstart"):
                    this.pressed = true;
                    break;
                case ("touchend"):
                    if (this.callback)
                        this.callback();
                    this.pressed = false;
                    break;
                case ("hover"):
                    break;
            }
    }
    isLayoutManager() {
        return false;
    }
    active() {
        return this.focused;
    }
    deactivate() {
        this.focused = false;
    }
    activate() {
        this.focused = true;
    }
    width() {
        return this.dimensions[0];
    }
    height() {
        return this.dimensions[1];
    }
    setCtxState(ctx) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        if (this.pressed)
            ctx.fillStyle = this.pressedColor.htmlRBGA();
        else
            ctx.fillStyle = this.unPressedColor.htmlRBGA();
        ctx.font = this.fontSize + `px ${this.fontName}`;
    }
    refresh() {
    }
    drawInternal(ctx, x, y) {
        const fs = ctx.fillStyle;
        this.setCtxState(ctx);
        ctx.fillRect(x, y, this.width(), this.height());
        ctx.fillStyle = this.text_color.htmlRBGA();
        const textWidth = ctx.measureText(this.text).width;
        const textHeight = this.fontSize;
        ctx.strokeStyle = this.outline_color.htmlRBGA();
        ctx.lineCap = "round";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, this.width(), this.height());
        if (textWidth < this.width() - 10) {
            //ctx.strokeText(this.text, x + this.width() / 2 - textWidth / 2, y + y + this.height() / 2 + textHeight / 2, this.width());
            ctx.fillText(this.text, x + this.width() / 2 - textWidth / 2, y + this.height() / 2 + textHeight / 2, this.width());
        }
        else {
            //ctx.strokeText(this.text, 10, y + this.height() / 2 + textHeight / 2, this.width() - 20);
            ctx.fillText(this.text, x + 10, y + this.height() / 2 + textHeight / 2, this.width() - 20);
        }
        ctx.fillStyle = fs;
    }
    draw(ctx, x, y, offsetX = 0, offsetY = 0) {
        this.drawInternal(ctx, x, y);
        //ctx.drawImage(this.canvas, x + offsetX, y + offsetY);
    }
}
GuiButton.default_pressedColor = new RGB(150, 150, 200, 255);
GuiButton.default_unPressedColor = new RGB(255, 255, 255, 195);
GuiButton.default_outline_color = new RGB(0, 0, 0, 255);
GuiButton.default_text_color = new RGB(0, 0, 0, 255);
;
;
export class GuiButtonFileOpener extends GuiButton {
    constructor(callback, text, width, height, fontSize = 12, pressedColor = new RGB(150, 150, 200, 255), unPressedColor = new RGB(255, 255, 255, 195), fontName = "Helvetica") {
        super(() => {
            const input = document.createElement('input');
            input.type = "file";
            input.addEventListener('change', (event) => {
                const fileList = event.target.files;
                fileList[0].arrayBuffer().then((buffer) => {
                    const binary = new Int32Array(buffer);
                    callback(binary);
                });
            });
            input.click();
        }, text, width, height, fontSize, pressedColor, unPressedColor, fontName);
    }
}
export class GuiCheckBox {
    constructor(callBack, width = 50, height = 50, checked = false, unPressedColor = new RGB(255, 255, 255, 0), pressedColor = new RGB(150, 150, 200, 255), fontSize = height - 10) {
        this.checked = checked;
        this.fontSize = fontSize;
        this.dimensions = [width, height];
        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext("2d");
        this.pressedColor = pressedColor;
        this.unPressedColor = unPressedColor;
        this.pressed = false;
        this.focused = true;
        this.callback = callBack;
        this.drawInternal();
    }
    handleKeyBoardEvents(type, e) {
        if (this.active()) {
            if (e.code === "Enter") {
                switch (type) {
                    case ("keydown"):
                        this.pressed = true;
                        this.drawInternal();
                        break;
                    case ("keyup"):
                        e.checkBox = this;
                        if (this.callback)
                            this.callback(e);
                        this.pressed = false;
                        this.drawInternal();
                        this.deactivate();
                        break;
                }
            }
        }
    }
    isLayoutManager() {
        return false;
    }
    handleTouchEvents(type, e) {
        if (this.active()) {
            switch (type) {
                case ("touchstart"):
                    this.pressed = true;
                    this.drawInternal();
                    break;
                case ("touchend"):
                    this.checked = !this.checked;
                    this.pressed = false;
                    e.checkBox = this;
                    if (this.callback)
                        this.callback(e);
                    this.drawInternal();
                    break;
            }
        }
    }
    active() {
        return this.focused;
    }
    deactivate() {
        this.focused = false;
    }
    activate() {
        this.focused = true;
    }
    width() {
        return this.dimensions[0];
    }
    height() {
        return this.dimensions[1];
    }
    setCtxState(ctx) {
        if (this.pressed)
            ctx.fillStyle = this.pressedColor.htmlRBGA();
        else
            ctx.fillStyle = this.unPressedColor.htmlRBGA();
        ctx.font = this.fontSize + 'px Calibri';
    }
    refresh() {
        this.drawInternal();
    }
    drawInternal(ctx = this.ctx) {
        const fs = ctx.fillStyle;
        this.setCtxState(ctx);
        ctx.clearRect(0, 0, this.width(), this.height());
        //ctx.fillRect(0, 0, this.width(), this.height());
        ctx.fillStyle = "#000000";
        ctx.strokeStyle = "#000000";
        ctx.strokeRect(1, 1, this.canvas.width - 2, this.canvas.height - 2);
        ctx.strokeStyle = "#FFFFFF";
        ctx.strokeRect(3, 3, this.canvas.width - 6, this.canvas.height - 6);
        ctx.fillText(this.checked ? "\u2713" : "", this.width() / 2 - this.ctx.measureText("\u2713").width / 2, 0 + this.fontSize, this.width());
        ctx.strokeText(this.checked ? "\u2713" : "", this.width() / 2 - this.ctx.measureText("\u2713").width / 2, 0 + this.fontSize, this.width());
        ctx.fillStyle = fs;
    }
    draw(ctx, x, y, offsetX = 0, offsetY = 0) {
        ctx.drawImage(this.canvas, x + offsetX, y + offsetY);
    }
}
;
export class TextRow {
    constructor(text, x, y, width, start) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.width = width;
        this.source_start_index = start;
    }
}
;
export class Optional {
    constructor() {
        this.data = null;
    }
    get() {
        return this.data;
    }
    set(data) {
        this.data = data;
    }
    clear() {
        this.data = null;
    }
}
;
;
class TextBoxChangeRecord {
    constructor(text, cursor, deletion) {
        this.new_text = text;
        this.cursor = cursor;
        this.deletion = deletion;
    }
}
;
export class GuiTextBox {
    constructor(key_listener, width, submit = null, fontSize = 16, height = 2 * fontSize, flags = GuiTextBox.default, validationCallback = null, selectedColor = new RGB(80, 80, 220), unSelectedColor = new RGB(100, 100, 100), outline = true, fontName = "courier", customFontFace = null) {
        this.keys_held = null;
        this.completed_actions = [];
        this.undone_actions = [];
        this.ignore_touch_event = false;
        this.highlighted_delta = 0;
        this.handleKeyEvents = key_listener;
        this.outlineTextBox = outline;
        this.validationCallback = validationCallback;
        GuiTextBox.textBoxRunningNumber++;
        this.textBoxId = GuiTextBox.textBoxRunningNumber;
        this.cursor = 0;
        this.flags = flags;
        this.focused = false;
        this.promptText = "";
        this.submissionButton = submit;
        this.selectedColor = selectedColor;
        this.unSelectedColor = unSelectedColor;
        this.asNumber = new Optional();
        this.text = "";
        this.scroll = [0, 0];
        this.scaledCursorPos = [0, 0];
        this.cursorPos = [0, 0];
        this.rows = [];
        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext("2d");
        this.dimensions = [width, height];
        this.fontSize = fontSize;
        this.fontName = fontName;
        const customFontName = "textBox_default";
        {
            if (customFontFace) {
                this.font = customFontFace;
                this.font.family;
            }
        }
    }
    //take scaled pos calc delta from cursor pos
    //
    isLayoutManager() {
        return false;
    }
    hflag() {
        return this.flags & GuiTextBox.horizontalAlignmentFlagsMask;
    }
    hcenter() {
        return this.hflag() === GuiTextBox.hcenter;
    }
    left() {
        return this.hflag() === GuiTextBox.left;
    }
    farleft() {
        return this.hflag() === GuiTextBox.farleft;
    }
    right() {
        return this.hflag() === GuiTextBox.right;
    }
    center() {
        return (this.flags & GuiTextBox.verticalAlignmentFlagsMask) === GuiTextBox.center;
    }
    top() {
        return (this.flags & GuiTextBox.verticalAlignmentFlagsMask) === GuiTextBox.top;
    }
    bottom() {
        return (this.flags & GuiTextBox.verticalAlignmentFlagsMask) === GuiTextBox.bottom;
    }
    min_selection_bound() {
        return this.highlighted_delta < 0 ? this.cursor + this.highlighted_delta : this.cursor;
    }
    max_selection_bound() {
        return this.highlighted_delta > 0 ? this.cursor + this.highlighted_delta : this.cursor;
    }
    delete_range(min_bound, max_bound, update_actions_record = true) {
        //extract text to be deleted into another string for storage in transactions
        const deleted_text = this.text.substring(min_bound, max_bound);
        this.text = this.text.substring(0, min_bound) + this.text.substring(max_bound, this.text.length);
        this.text_widths.splice(min_bound, max_bound - min_bound);
        if (this.highlighted_delta < 0)
            this.cursor += this.highlighted_delta;
        this.highlighted_delta = 0;
        this.cursor = clamp(this.cursor, 0, this.text.length);
        if (update_actions_record)
            this.completed_actions.push(new TextBoxChangeRecord(deleted_text, this.cursor, true));
    }
    delete_selection(update_actions_record = true) {
        if (this.highlight_active())
            this.delete_range(this.min_selection_bound(), this.max_selection_bound(), update_actions_record);
    }
    rebuild_text_widths() {
        if (!this.text_widths)
            this.text_widths = [];
        this.text_widths.length = 0;
        for (let i = 0; i < this.text.length; i++) {
            this.text_widths.push(this.ctx.measureText(this.text[i]).width);
        }
    }
    insert_char(char, refresh = true, update_actions_record = true) {
        if (this.text_widths === undefined || this.text.length !== this.text_widths.length) {
            this.rebuild_text_widths();
        }
        //if highlight active delete highlighted first
        if (this.highlight_active()) {
            this.delete_selection(update_actions_record);
        }
        if (update_actions_record) {
            this.undone_actions.length = 0;
            this.completed_actions.push(new TextBoxChangeRecord(char, this.cursor, false));
        }
        //keep text_widths metadata up to date
        const char_width = [];
        for (let i = 0; i < char.length; i++) {
            char_width.push(this.ctx.measureText(char[i]).width);
        }
        this.text_widths.splice(this.cursor, 0, ...char_width);
        this.text = this.text.substring(0, this.cursor) + char + this.text.substring(this.cursor, this.text.length);
        this.cursor += char.length;
        this.calcNumber();
        if (refresh)
            this.drawInternalAndClear();
    }
    undo() {
        const action = this.completed_actions.pop();
        if (action !== undefined) {
            this.undone_actions.push(action);
            this.cursor = action.cursor;
            if (action.deletion)
                this.insert_char(action.new_text, false, false);
            else
                this.delete_range(action.cursor, action.cursor + action.new_text.length, false);
            this.drawInternalAndClear();
        }
    }
    redo() {
        const action = this.undone_actions.pop();
        if (action !== undefined) {
            this.completed_actions.push(action);
            this.cursor = action.cursor;
            if (!action.deletion)
                this.insert_char(action.new_text, false, false);
            else
                this.delete_range(action.cursor, action.cursor + action.new_text.length, false);
            this.drawInternalAndClear();
        }
    }
    selected_text() {
        return this.text.substring(this.min_selection_bound(), this.max_selection_bound());
    }
    handleKeyBoardEvents(type, e) {
        this.keys_held = e.keysHeld;
        let preventDefault = false;
        if (this.active() && this.handleKeyEvents && type === "keydown") {
            preventDefault = true;
            const oldText = this.text;
            const oldCursor = this.cursor;
            console.log(e.code);
            if (this.control_held()) {
                if (e.code === "KeyA") {
                    this.cursor = 0;
                    this.highlighted_delta = this.text.length;
                }
                else if (e.code === "KeyC") {
                    this.copy();
                }
                else if (e.code === "KeyX") {
                    this.cut();
                }
                else if (e.code === "KeyV") {
                    this.paste();
                }
                else if ((e.keysHeld["ShiftLeft"] || e.keysHeld["ShiftRight"]) && e.code === "KeyZ") {
                    this.redo();
                }
                else if (e.code === "KeyZ") {
                    this.undo();
                }
                else if (e.code === "KeyY") {
                    this.redo();
                }
            }
            else if (this.alt_held()) {
                if (type == "keydown")
                    switch (e.code) {
                        case ("Delete"):
                            if (this.highlight_active()) {
                                this.delete_selection();
                            }
                            else {
                                this.text_widths.splice(this.cursor - 1, 1);
                                this.text = this.text.substring(0, this.cursor - 1) + this.text.substring(this.cursor, this.text.length);
                            }
                            break;
                        case ("ArrowLeft"):
                            if (this.cursor > 0) {
                                this.highlighted_delta++;
                                clamp(this.highlighted_delta, -this.cursor, this.text.length - this.cursor);
                                this.cursor--;
                            }
                            break;
                        case ("ArrowRight"):
                            if (this.cursor < this.text.length) {
                                this.highlighted_delta--;
                                clamp(this.highlighted_delta, -this.cursor, this.text.length - this.cursor);
                                this.cursor++;
                            }
                            break;
                        case ("ArrowUp"):
                            this.highlighted_delta = -this.cursor;
                            this.cursor = 0;
                            break;
                        case ("ArrowDown"):
                            this.cursor = (this.text.length);
                            this.highlighted_delta = this.text.length - this.cursor;
                            break;
                    }
            }
            else if (this.shift_held()) {
                if (GuiTextBox.textUpperCaseLookup[e.code]) {
                    this.insert_char(GuiTextBox.textUpperCaseLookup[e.code], e);
                }
                else
                    switch (e.code) {
                        case ("Backspace"):
                            e.keysHeld["ShiftLeft"] = null;
                            e.keysHeld["ShiftRight"] = null;
                            break;
                        default:
                            let letter = e.code.substring(e.code.length - 1);
                            if (GuiTextBox.textLookup[e.code]) {
                                this.insert_char(letter, e);
                            }
                            break;
                    }
            }
            else {
                switch (type) {
                    case ("keydown"):
                        switch (e.code) {
                            case ("NumpadEnter"):
                            case ("Enter"):
                                //if highlight active delete highlighted first
                                if (this.highlight_active()) {
                                    this.delete_selection();
                                }
                                this.deactivate();
                                if (this.submissionButton) {
                                    this.submissionButton.activate();
                                    this.submissionButton.handleKeyBoardEvents(type, e);
                                }
                                break;
                            case ("Backspace"):
                                //if highlight active delete highlighted first
                                if (this.highlight_active()) {
                                    this.delete_selection();
                                }
                                else {
                                    this.text_widths.splice(this.cursor, 1);
                                    this.text = this.text.substring(0, this.cursor - 1) + this.text.substring(this.cursor, this.text.length);
                                    this.cursor -= +(this.cursor > 0);
                                }
                                break;
                            case ("Delete"):
                                if (this.highlight_active()) {
                                    this.delete_selection();
                                }
                                else {
                                    this.text_widths.splice(this.cursor, 1);
                                    this.text = this.text.substring(0, this.cursor) + this.text.substring(this.cursor + 1, this.text.length);
                                }
                                break;
                            case ("ArrowLeft"):
                                this.cursor -= +(this.cursor > 0);
                                break;
                            case ("ArrowRight"):
                                this.cursor += +(this.cursor < this.text.length);
                                break;
                            case ("ArrowUp"):
                                if (!this.highlight_active())
                                    this.cursor = 0;
                                else
                                    this.highlighted_delta = 0;
                                break;
                            case ("ArrowDown"):
                                if (!this.highlight_active())
                                    this.cursor = this.text.length;
                                else
                                    this.highlighted_delta = 0;
                                break;
                            default:
                                {
                                    let letter = e.code.substring(e.code.length - 1);
                                    letter = letter.toLowerCase();
                                    if (GuiTextBox.textLookup[e.code]) {
                                        this.insert_char(GuiTextBox.textLookup[e.code]);
                                    }
                                    else if (GuiTextBox.numbers[e.code]) {
                                        this.insert_char(GuiTextBox.numbers[e.code]);
                                    }
                                    else if (GuiTextBox.specialChars[e.code] && e.code.substring(0, "Numpad".length) === "Numpad" && e.code["Numpad".length]) {
                                        this.insert_char(GuiTextBox.specialChars[e.code]);
                                    }
                                    else if (e.code.substring(0, "Numpad".length) === "Numpad" || e.code.substring(0, "Digit".length) === "Digit") {
                                        this.insert_char(letter);
                                    }
                                }
                        }
                }
            }
            this.calcNumber();
            if (this.validationCallback) {
                if (!this.validationCallback({ textbox: this, event: e, oldCursor: oldCursor, oldText: oldText })) {
                    this.text = oldText;
                    this.cursor = oldCursor;
                }
            }
            this.drawInternalAndClear();
        }
        if (preventDefault)
            e.preventDefault();
    }
    setText(text) {
        this.text = text;
        this.cursor = text.length;
        this.calcNumber();
        this.drawInternalAndClear();
    }
    calcNumber() {
        if (!isNaN(Number(this.text))) {
            this.asNumber.set(Number(this.text));
        }
        else
            this.asNumber.clear();
    }
    highlight_active() {
        return this.highlighted_delta !== 0;
    }
    paste() {
        if (!navigator.clipboard)
            return;
        this.delete_selection();
        navigator.clipboard.readText().then((text) => {
            //despite the name it is capable of inserting multi-char strings
            this.insert_char(text);
        });
    }
    cut() {
        if (!navigator.clipboard)
            return;
        navigator.clipboard.readText().then((text) => {
            navigator.clipboard.writeText(this.selected_text());
            this.delete_selection();
            this.drawInternalAndClear();
        });
    }
    copy() {
        if (!navigator.clipboard)
            return;
        navigator.clipboard.readText().then((text) => {
            navigator.clipboard.writeText(this.selected_text());
        });
    }
    alt_held() {
        return this.keys_held["AltLeft"] || this.keys_held["AltRight"];
    }
    shift_held() {
        return this.keys_held["ShiftLeft"] || this.keys_held["ShiftRight"];
    }
    control_held() {
        return this.keys_held && (this.keys_held["ControlLeft"] || this.keys_held["ControlRight"] ||
            this.keys_held["MetaLeft"] || this.keys_held["MetaRight"]);
    }
    create_menu() {
        const menu = new ContextMenu([100, 140 + (isTouchSupported() ? 80 : 0)], 0, 0);
        menu.add_option(() => {
            this.paste();
        }, "Paste");
        menu.add_option(() => {
            this.cut();
        }, "Cut");
        menu.add_option(() => {
            this.copy();
        }, "Copy");
        menu.add_option(() => {
            this.undo();
        }, "Undo");
        menu.add_option(() => {
            this.redo();
        }, "Redo");
        menu.add_option(() => {
            this.cursor = 0;
            this.highlighted_delta = this.text.length;
        }, "Select All");
        menu.add_option(() => {
            this.delete_range(0, this.text.length);
        }, "Clear");
        return menu;
    }
    handleTouchEvents(type, e) {
        if (this.active() && this.handleKeyEvents) {
            this.rebuild_text_widths();
            const touch_text_index = this.screenToTextIndex(e.touchPos);
            if (type === "longtap" && isTouchSupported()) {
                this.ignore_touch_event = true;
                throw this.create_menu();
            }
            if (type === "touchstart") {
                //create context menu on "right" click
                if ((!isTouchSupported() && (e.button > 0) || this.control_held())) {
                    this.ignore_touch_event = true;
                    throw this.create_menu();
                }
                this.ignore_touch_event = false;
            }
            else if (this.ignore_touch_event) 
            //gives the opportunity to specify in a touchstart event to ignore the remainder
            //of touch events that will be fired after touch start (used when right click menu fired to prevent updating cursor/ highlighted area)
            {
                return;
            }
            else if (type === "touchmove" && !isTouchSupported()) {
                if (e.moveCount === 1)
                    this.cursor = touch_text_index;
                const delta = -this.cursor + touch_text_index;
                if (delta)
                    this.highlighted_delta = delta;
            }
            else if (type === "tap") {
                this.highlighted_delta = 0;
                this.cursor = touch_text_index;
                //this.highlighted_delta = this.cursor - touch_text_index;
                //this.cursor = touch_text_index;
                this.drawInternalAndClear();
            }
            else if (type === "doubletap") {
                //should probably be refactored, but finds beginning and end of word delimited by spaces
                //and makes that the highlighted area
                let start = this.cursor;
                while (start > 0 && this.text[start] !== ' ') {
                    start--;
                }
                start += +(this.text[start] === ' ');
                let end = this.cursor;
                while (end < this.text.length && this.text[end] !== ' ') {
                    end++;
                }
                end -= +(this.text[end] === ' ');
                this.cursor = start;
                this.highlighted_delta = end - start;
            }
            //just brings up prompt for mobile devices where I cannot bring up keyboard like a normal texbox
            else if (type === "touchend" && isTouchSupported()) {
                const value = prompt(this.promptText, this.text);
                if (value) {
                    this.setText(value);
                    this.calcNumber();
                    this.deactivate();
                    if (this.submissionButton) {
                        this.submissionButton.activate();
                        this.submissionButton.callback();
                    }
                }
                this.drawInternalAndClear();
            }
        }
    }
    static initGlobalText() {
        for (let i = 65; i < 65 + 26; i++)
            GuiTextBox.textLookup["Key" + String.fromCharCode(i)] = String.fromCharCode(i).toLowerCase();
    }
    ;
    static initGlobalNumbers() {
        for (let i = 48; i < 48 + 10; i++) {
            GuiTextBox.numbers["Digit" + String.fromCharCode(i)] = String.fromCharCode(i);
        }
    }
    ;
    static initGlobalSpecialChars() {
        //specialChars
    }
    active() {
        return this.focused;
    }
    deactivate() {
        this.focused = false;
        this.refresh();
    }
    activate() {
        this.focused = true;
        this.refresh();
    }
    textWidth() {
        return this.ctx.measureText(this.text).width;
    }
    setCtxState() {
        this.ctx.strokeStyle = "#000000";
        this.ctx.font = this.fontSize + `px ${this.fontName}`;
    }
    width() {
        return this.dimensions[0];
    }
    height() {
        return this.dimensions[1];
    }
    refreshMetaData() {
        // use text_widths to calculate spacing also ignore horizontal offset for simplicity
        let i = 0;
        let x = 0;
        let y = 0;
        let start = 0;
        this.rows = [];
        if (this.text_widths === undefined || this.text.length !== this.text_widths.length) {
            this.rebuild_text_widths();
        }
        for (; i < this.text.length; i++) {
            const char = this.text[i];
            const width = this.text_widths[i];
            if (i === this.cursor) {
                this.cursorPos = [x, y];
            }
            if (x > this.width() - 10 || char === '\n') {
                this.rows.push(new TextRow(this.text.substring(start, i), 0, y, this.width(), start));
                start = i;
                y += this.fontSize;
                x = 0;
            }
            x += width;
        }
        if (i === this.cursor) {
            this.cursorPos = [x, y];
        }
        this.rows.push(new TextRow(this.text.substring(start, i), 0, y, this.width(), start));
    }
    cursorRowIndex() {
        let index = 0;
        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows[i];
            if (row.y === Math.floor(this.cursor / this.fontSize))
                index = i;
        }
        return index;
    }
    screenToTextIndex(pos) {
        const x = pos[0];
        const y = pos[1] + this.fontSize;
        const rows = this.rows;
        let letters_in_previous_rows = 0;
        let row_index = 0;
        while (rows[row_index + 1] && rows[row_index + 1].y < y) {
            letters_in_previous_rows += rows[row_index].text.length;
            row_index++;
        }
        let column_index = 0;
        while (rows[row_index].text[column_index] && rows[row_index].x + this.sum_widths(letters_in_previous_rows, column_index + 1) < x) {
            column_index++;
        }
        return letters_in_previous_rows + column_index;
    }
    adjustScrollToCursor() {
        let deltaY = 0;
        let deltaX = 0;
        if (this.cursorPos[1] > this.height() - 3) {
            deltaY += this.cursorPos[1] - this.height() + this.fontSize / 3;
        }
        else if (this.cursorPos[1] < this.height() - 3) {
            deltaY += this.cursorPos[1] - this.height() + this.fontSize / 3;
        }
        if (this.rows.length) {
            let freeSpace = this.width(); // - this.rows[0].width;
            let maxWidth = 0;
            this.rows.forEach(el => {
                const width = this.ctx.measureText(el.text).width;
                if (freeSpace > this.width() - width) {
                    freeSpace = this.width() - width;
                    maxWidth = width;
                }
            });
            if (this.hcenter()) {
                //deltaX -= freeSpace / 2 - maxWidth / 2;
            }
            else if (this.left()) {
                //deltaX -= this.ctx.measureText("0").width / 3;
            }
            else if (this.right()) {
                //deltaX -= freeSpace + this.ctx.measureText("0").width / 3;
            }
        }
        deltaX -= 1;
        const newRows = [];
        this.rows.forEach(row => newRows.push(new TextRow(row.text, row.x - deltaX, row.y - deltaY, row.width, row.source_start_index)));
        this.scaledCursorPos[1] = this.cursorPos[1] - deltaY;
        this.scaledCursorPos[0] = this.cursorPos[0] - deltaX;
        this.scroll[1] = -deltaY;
        return newRows;
    }
    sum_widths(start, length) {
        let sum = 0;
        for (let i = start; i < length + start && i < this.text.length; i++) {
            sum += this.text_widths[i];
        }
        return sum;
    }
    drawRows(rows) {
        //todo render highlighted selection
        rows.forEach(row => {
            this.ctx.lineWidth = 4;
            if (row.width > this.width()) {
                this.ctx.strokeText(row.text, 0, row.y, this.width());
                this.ctx.fillText(row.text, 0, row.y, this.width());
            }
            else {
                this.ctx.strokeText(row.text, row.x, row.y, row.width);
                this.ctx.fillText(row.text, row.x, row.y, row.width);
            }
            if (this.highlight_active()) {
                const min_bound = this.min_selection_bound();
                const max_bound = this.max_selection_bound();
                const old_style = this.ctx.fillStyle;
                this.ctx.fillStyle = new RGB(50, 140, 220, 100).htmlRBGA();
                {
                    const min_bound_in_row = Math.max(min_bound, row.source_start_index);
                    const highlighted_x = this.sum_widths(row.source_start_index, min_bound_in_row - row.source_start_index);
                    const highlighted_width = this.sum_widths(min_bound_in_row, Math.min(max_bound, row.source_start_index + row.text.length) - min_bound_in_row);
                    this.ctx.fillRect(row.x + highlighted_x, row.y - this.fontSize, highlighted_width, this.fontSize);
                }
                this.ctx.fillStyle = old_style;
            }
        });
    }
    drawCursor() {
        if (this.active() && this.handleKeyEvents) {
            this.ctx.fillStyle = "#000000";
            this.ctx.fillRect(this.scaledCursorPos[0], this.scaledCursorPos[1] - this.fontSize + 3, 2, this.fontSize - 2);
        }
    }
    color() {
        if (this.active())
            return this.selectedColor;
        else
            return this.unSelectedColor;
    }
    refresh() {
        this.drawInternalAndClear();
    }
    drawInternalAndClear() {
        this.setCtxState();
        this.ctx.clearRect(0, 0, this.width(), this.height());
        this.ctx.fillStyle = "#000000";
        this.rows.splice(0, this.rows.length);
        this.refreshMetaData();
        this.ctx.strokeStyle = "#FFFFFF";
        this.rows = this.adjustScrollToCursor();
        this.drawRows(this.rows);
        this.drawCursor();
        if (this.outlineTextBox) {
            this.ctx.strokeStyle = this.color().htmlRBG();
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(0, 0, this.width(), this.height());
        }
    }
    draw(ctx, x, y, offsetX = 0, offsetY = 0) {
        this.drawInternalAndClear();
        ctx.drawImage(this.canvas, x + offsetX, y + offsetY);
    }
}
GuiTextBox.center = 0;
GuiTextBox.bottom = 1;
GuiTextBox.top = 2;
GuiTextBox.verticalAlignmentFlagsMask = 0b0011;
GuiTextBox.left = 0;
GuiTextBox.hcenter = (1 << 2);
GuiTextBox.right = (2 << 2);
GuiTextBox.farleft = (3 << 2);
GuiTextBox.horizontalAlignmentFlagsMask = 0b1100;
GuiTextBox.default = GuiTextBox.center | GuiTextBox.left;
GuiTextBox.action_lookup = {};
GuiTextBox.textLookup = { Minus: "-", Period: ".", Comma: ",", Equal: "=", Slash: "/", BracketLeft: "[", BracketRight: "]",
    Space: " ", Semicolon: ";", Quote: "'", Backslash: "\\" };
GuiTextBox.textUpperCaseLookup = { Minus: "_", Period: ">", Comma: "<", Equal: "+", Slash: "?", BracketLeft: "{", BracketRight: "}", Quote: '"', Backslash: "|",
    Space: " ", Semicolon: ":", Digit1: "!", Digit2: "@", Digit3: "#", Digit4: "$", Digit5: "%", Digit6: "^", Digit7: "&", Digit8: "*", Digit9: "(", Digit0: ")" };
GuiTextBox.numbers = {};
GuiTextBox.specialChars = { NumpadAdd: '+', NumpadMultiply: '*', NumpadDivide: '/', NumpadSubtract: '-',
    NumpadDecimal: "." };
GuiTextBox.textBoxRunningNumber = 0;
;
export class GuiLabel extends GuiButton {
    constructor(text, width, fontSize = 16, height = 2 * fontSize) {
        super(() => { }, text, width, height, fontSize);
        this.outline_color = new RGB(0, 0, 0, 255);
    }
    //override the textbox's handlers
    handleKeyBoardEvents(type, e) { }
    handleTouchEvents(type, e) { }
    active() {
        return false;
    }
}
;
export class GuiLabelComplex extends GuiTextBox {
    constructor(text, width, fontSize = 16, height = 2 * fontSize, flags = GuiTextBox.bottom | GuiTextBox.left, backgroundColor = new RGB(255, 255, 255, 0)) {
        super(false, width, null, fontSize, height, flags, null, backgroundColor, backgroundColor, false);
        this.setText(text);
    }
    //override the textbox's handlers
    handleKeyBoardEvents(type, e) { }
    handleTouchEvents(type, e) { }
    active() {
        return false;
    }
}
;
export class GuiRadioGroup {
    constructor(pixelDim, matrixDim) {
        this.layout = new SimpleGridLayoutManager(matrixDim, pixelDim, 0, 0);
    }
    active() {
        return this.layout.active();
    }
    deactivate() {
        this.layout.deactivate();
    }
    activate() {
        this.layout.activate();
    }
    width() {
        return this.layout.width();
    }
    height() {
        return this.layout.height();
    }
    refresh() {
        this.layout.refresh();
    }
    draw(ctx, x, y, offsetX, offsetY) {
        this.layout.draw(ctx, x, y, offsetX, offsetY);
    }
    handleKeyBoardEvents(type, e) {
        this.layout.handleKeyBoardEvents(type, e);
    }
    handleTouchEvents(type, e) {
        this.layout.handleTouchEvents(type, e);
    }
    isLayoutManager() {
        return false;
    }
}
;
GuiTextBox.initGlobalText();
GuiTextBox.initGlobalNumbers();
GuiTextBox.initGlobalSpecialChars();
export class GuiToolBar {
    constructor(renderDim, tools = []) {
        this.focused = false;
        this.selected = 0;
        this.vertical = true;
        this.toolsPerRow = 10;
        this.toolRenderDim = [renderDim[0], renderDim[1]];
        this.tools = tools;
        this.canvas = document.createElement("canvas");
        this.canvas.height = this.height();
        this.canvas.width = this.width();
        this.ctx = this.canvas.getContext("2d");
        this.ctx.strokeStyle = "#000000";
    }
    setImagesIndex(value) {
        this.tools.forEach(tool => {
            if (tool.toolImages.length > value)
                tool.selected = value;
        });
    }
    resize(width = this.width(), height = this.height()) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.strokeStyle = "#000000";
    }
    active() {
        return this.focused;
    }
    deactivate() {
        this.focused = false;
    }
    activate() {
        this.focused = true;
    }
    width() {
        if (this.vertical)
            return this.toolRenderDim[0] * (1 + Math.floor(this.tools.length / this.toolsPerRow));
        else
            return this.toolRenderDim[0] * this.toolsPerRow;
    }
    height() {
        if (this.vertical)
            return this.toolRenderDim[1] * this.toolsPerRow;
        else
            return this.toolRenderDim[1] * (1 + Math.floor(this.tools.length / this.toolsPerRow));
    }
    refresh() {
        this.ctx.clearRect(0, 0, this.width(), this.height());
        for (let i = 0; i < this.tools.length; i++) {
            let gridX = 0;
            let gridY = 0;
            if (this.vertical) {
                const toolsPerColumn = this.toolsPerRow;
                gridX = Math.floor(i / toolsPerColumn);
                gridY = i % toolsPerColumn;
            }
            else {
                gridX = i % this.toolsPerRow;
                gridY = Math.floor(i / this.toolsPerRow);
            }
            const pixelX = gridX * this.toolRenderDim[0];
            const pixelY = gridY * this.toolRenderDim[1];
            const image = this.tools[i].image();
            if (image && image.width && image.height) {
                this.ctx.drawImage(image, pixelX, pixelY, this.toolRenderDim[0], this.toolRenderDim[1]);
            }
            if (this.selected === i) {
                this.ctx.strokeStyle = "#FFFFFF";
                this.ctx.strokeRect(pixelX + 3, pixelY + 3, this.toolRenderDim[0] - 6, this.toolRenderDim[1] - 6);
                this.ctx.strokeStyle = "#000000";
                this.ctx.strokeRect(pixelX + 1, pixelY + 1, this.toolRenderDim[0] - 2, this.toolRenderDim[1] - 2);
            }
        }
    }
    draw(ctx, x, y, offsetX = 0, offsetY = 0) {
        ctx.drawImage(this.canvas, x + offsetX, y + offsetY);
    }
    handleKeyBoardEvents(type, e) { }
    tool() {
        return this.tools[this.selected];
    }
    handleTouchEvents(type, e) {
        if (this.active()) {
            switch (type) {
                case ("touchstart"):
                    const x = Math.floor(e.touchPos[0] / this.toolRenderDim[0]);
                    const y = Math.floor(e.touchPos[1] / this.toolRenderDim[1]);
                    const clicked = this.vertical ? y + x * this.toolsPerRow : x + y * this.toolsPerRow;
                    if (clicked >= 0 && clicked < this.tools.length) {
                        this.selected = clicked;
                    }
            }
            this.refresh();
        }
    }
    isLayoutManager() {
        return false;
    }
}
;
;
//tbd
export class RGB24BitPalette {
    constructor() {
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.colorData = null;
        this.refresh();
    }
    refresh() {
        this.colorData = new Int32Array(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data.buffer);
    }
    getColorAt(x, y) {
        return new RGB(0, 0, 0);
    }
    draw(ctx, x, y, width, height) {
    }
}
;
export class ToolBarItem {
    constructor(toolName, toolImagePath, selected = 0) {
        this.selected = selected;
        this.toolImages = [];
        if (Array.isArray(toolName) && !(toolImagePath instanceof String) && toolName.length === toolImagePath.length) {
            for (let i = 0; i < toolName.length; i++)
                this.toolImages.push(new ImageContainer(toolName[i], toolImagePath[i]));
        }
        else if (toolName && !Array.isArray(toolName) && Array.isArray(toolImagePath)) {
            for (let i = 0; i < toolName.length; i++)
                this.toolImages.push(new ImageContainer(toolName, toolImagePath[i]));
        }
        else if (Array.isArray(toolName) && Array.isArray(toolImagePath) && toolName.length !== toolImagePath.length)
            throw new Error("Invalid params for toolbar item both lists must be same length");
        else if (toolName && !Array.isArray(toolName) && !Array.isArray(toolImagePath)) {
            this.toolImages.push(new ImageContainer(toolName, toolImagePath));
        }
        else if (!(toolName instanceof String) && (toolImagePath instanceof String)) {
            throw new Error("Invalid params for toolbar item both params should be same type");
        }
    }
    imageContainer() {
        return this.toolImages[this.selected];
    }
    width() {
        return this.imageContainer().image.width;
    }
    height() {
        return this.imageContainer().image.height;
    }
    image() {
        if (this.imageContainer())
            return this.imageContainer().image;
        return null;
    }
    name() {
        return this.imageContainer().name;
    }
    drawImage(ctx, x, y, width, height) {
        if (this.image()) {
            ctx.drawImage(this.image(), x, y, width, height);
        }
    }
}
;
export class Tool extends ToolBarItem {
    constructor(toolName, toolImagePath) {
        super(toolName, toolImagePath);
    }
}
;
export class ViewLayoutTool extends Tool {
    constructor(layoutManager, name, path) {
        super(name, path);
        this.layoutManager = layoutManager;
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
export class GenericTool extends Tool {
    constructor(name, imagePath) {
        super(name, imagePath);
    }
    activateOptionPanel() { }
    deactivateOptionPanel() { }
    getOptionPanel() {
        return null;
    }
    optionPanelSize() {
        return [0, 0];
    }
    drawOptionPanel(ctx, x, y) { }
}
;
export class ExtendedTool extends ViewLayoutTool {
    constructor(name, path, optionPanes, dim, matrixDim = [24, 24], parentMatrixDim = [24, 48]) {
        super(new SimpleGridLayoutManager([parentMatrixDim[0], parentMatrixDim[1]], [dim[0], dim[1]]), name, path);
        this.localLayout = new SimpleGridLayoutManager([matrixDim[0], matrixDim[1]], [dim[0], dim[1]]);
        const parentPanel = this.getOptionPanel();
        parentPanel.addElement(this.localLayout);
        this.optionPanels = [this.localLayout];
        let maxY = this.localLayout.height();
        let maxX = this.localLayout.width();
        optionPanes.forEach((pane) => {
            parentPanel.addElement(pane);
            this.optionPanels.push(pane);
            maxY += pane.height();
        });
        parentPanel.setHeight(maxY);
        parentPanel.setWidth(maxX);
        parentPanel.refreshMetaData();
        maxY = 0;
        parentPanel.elementsPositions.forEach(el => {
            if (el.y + el.height > maxY) {
                maxY = el.y + el.height;
            }
        });
        parentPanel.setWidth(maxX);
        parentPanel.setHeight(dim[1] + maxY);
        parentPanel.refreshMetaData();
    }
    activateOptionPanel() {
        this.getOptionPanel().activate();
        this.optionPanels.forEach(element => {
            element.activate();
        });
    }
    deactivateOptionPanel() {
        this.getOptionPanel().deactivate();
        this.optionPanels.forEach(element => {
            element.deactivate();
        });
    }
}
;
export class SingleCheckBoxTool extends GenericTool {
    constructor(label, name, imagePath, callback = () => null) {
        super(name, imagePath);
        this.optionPanel = new SimpleGridLayoutManager([1, 4], [200, 90]);
        this.checkBox = new GuiCheckBox(callback, 40, 40);
        this.optionPanel.addElement(new GuiLabel(label, 200, 16));
        this.optionPanel.addElement(this.checkBox);
    }
    activateOptionPanel() { this.optionPanel.activate(); }
    deactivateOptionPanel() { this.optionPanel.deactivate(); }
    getOptionPanel() {
        return this.optionPanel;
    }
    optionPanelSize() {
        return [this.optionPanel.width(), this.optionPanel.height()];
    }
    drawOptionPanel(ctx, x, y) {
        const optionPanel = this.getOptionPanel();
        optionPanel.x = x;
        optionPanel.y = y;
        optionPanel.draw(ctx, x, y);
    }
}
;
export function buildSpriteFromBuffer(buffer, index) {
    const size = buffer[index++];
    const type = buffer[index++];
    const height = buffer[index] >> 16;
    const width = buffer[index++] & ((1 << 17) - 1);
    const sprite = new Sprite([], width, height);
    if (type !== 3)
        throw new Error("Corrupted project file sprite type should be: 3, but is: " + type.toString());
    if (width * height !== size - 3)
        throw new Error("Corrupted project file, sprite width, and height are: (" + width.toString() + "," + height.toString() + "), but size is: " + size.toString());
    const limit = width * height;
    const view = new Int32Array(sprite.pixels.buffer);
    for (let i = 0; i < limit; i++) {
        view[i] = buffer[index];
        index++;
    }
    sprite.refreshImage();
    return new Pair(sprite, size);
}
export function buildSpriteAnimationFromBuffer(buffer, index) {
    const size = buffer[index++];
    const type = buffer[index++];
    const width = buffer[index + 2] >> 16;
    const height = buffer[index + 2] & ((1 << 16) - 1);
    if (type !== 2)
        throw new Error("Corrupted project file animation type should be: 2, but is: " + type.toString());
    let i = 2;
    const animation = new SpriteAnimation(0, 0, width, height);
    for (; i < size - 2;) {
        const result = buildSpriteFromBuffer(buffer, index);
        index += result.second;
        i += result.second;
        animation.pushSprite(result.first);
    }
    let spriteMemory = 0;
    animation.sprites.forEach((sprite) => spriteMemory += (sprite.pixels.length >> 2) + 3);
    if (spriteMemory !== size - 2)
        throw new Error("Error invalid group size: " + size.toString() + " should be: " + size.toString());
    return new Pair(animation, size);
}
export class Sprite {
    constructor(pixels, width, height, fillBackground = false) {
        this.fillBackground = fillBackground;
        this.imageData = null;
        this.pixels = null;
        this.image = document.createElement("canvas");
        this.ctx = this.image.getContext("2d", { desynchronized: true });
        this.width = width;
        this.height = height;
        if (width * height > 0)
            this.copy(pixels, width, height);
    }
    copyCanvas(canvas) {
        this.width = canvas.width;
        this.height = canvas.height;
        this.image.width = this.width;
        this.image.height = this.height;
        this.ctx = this.image.getContext("2d");
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(canvas, 0, 0);
        this.imageData = this.ctx.getImageData(0, 0, this.width, this.height);
        this.pixels = this.imageData.data;
    }
    flipHorizontally() {
        let left = new RGB(0, 0, 0, 0);
        let right = new RGB(0, 0, 0, 0);
        for (let y = 0; y < this.height; y++) {
            const yOffset = y * this.width;
            for (let x = 0; x < this.width << 1; x++) {
                left.color = this.pixels[x + yOffset];
                right.color = this.pixels[yOffset + (this.width - 1) - x];
                if (left && right) {
                    const temp = left.color;
                    left.copy(right);
                    right.color = temp;
                }
            }
        }
        this.refreshImage();
    }
    copyImage(image) {
        this.width = image.width;
        this.height = image.height;
        this.image.width = this.width;
        this.image.height = this.height;
        this.ctx = this.image.getContext("2d");
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(image, 0, 0);
        this.imageData = this.ctx.getImageData(0, 0, this.width, this.height);
        this.pixels = this.imageData.data;
    }
    createImageData() {
        const canvas = this.image;
        if (canvas.width !== this.width || canvas.height !== this.height) {
            canvas.width = this.width;
            canvas.height = this.height;
        }
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        return this.ctx.createImageData(this.width, this.height);
    }
    copy(pixels, width, height) {
        this.width = width;
        this.height = height;
        if (width !== 0 && height !== 0) {
            if (!this.pixels || this.pixels.length !== pixels.length || this.pixels.length > 0) {
                this.imageData = this.createImageData();
                this.pixels = this.imageData.data;
            }
            const view = new Int32Array(this.pixels.buffer);
            for (let i = 0; i < pixels.length; i++) {
                view[i] = pixels[i].color;
            }
            if (pixels.length)
                this.refreshImage();
        }
    }
    putPixels(ctx) {
        if (this.imageData)
            ctx.putImageData(this.imageData, 0, 0);
    }
    fillRect(color, x, y, width, height, view = new Int32Array(this.pixels.buffer)) {
        for (let yi = y; yi < y + height; yi++) {
            const yiIndex = (yi * this.width);
            const rowLimit = x + width + yiIndex;
            for (let xi = x + yiIndex; xi < rowLimit; xi++) {
                view[xi] = color.color;
            }
        }
    }
    fillRectAlphaBlend(source, color, x, y, width, height, view = new Int32Array(this.pixels.buffer)) {
        for (let yi = y; yi < y + height; yi++) {
            for (let xi = x; xi < x + width; xi++) {
                let index = (xi) + (yi * this.width);
                source.color = view[index];
                source.blendAlphaCopy(color);
                view[index] = source.color;
            }
        }
    }
    copyToBuffer(buf, width, height, view = new Int32Array(this.pixels.buffer)) {
        if (width * height !== buf.length) {
            console.log("error invalid dimensions supplied");
            return;
        }
        for (let y = 0; y < this.height && y < height; y++) {
            for (let x = 0; x < this.width && x < width; x++) {
                const i = (x + y * width);
                const vi = x + y * this.width;
                buf[i].color = view[vi];
            }
        }
    }
    binaryFileSize() {
        return 3 + this.width * this.height;
    }
    saveToUint32Buffer(buf, index, view = new Int32Array(this.pixels.buffer)) {
        buf[index++] = this.binaryFileSize();
        buf[index++] = 3;
        buf[index] |= this.height << 16;
        buf[index++] |= this.width;
        for (let i = 0; i < view.length; i++) {
            buf[index] = view[i];
            index++;
        }
        return index;
    }
    refreshImage() {
        const canvas = this.image;
        if (canvas.width !== this.width || canvas.height !== this.height) {
            canvas.width = this.width;
            canvas.height = this.height;
            this.ctx = canvas.getContext("2d");
        }
        this.putPixels(this.ctx);
    }
    copySprite(sprite) {
        this.width = sprite.width;
        this.height = sprite.height;
        this.imageData = this.createImageData();
        this.pixels = this.imageData.data;
        for (let i = 0; i < this.pixels.length;) {
            this.pixels[i] = sprite.pixels[i++];
            this.pixels[i] = sprite.pixels[i++];
            this.pixels[i] = sprite.pixels[i++];
            this.pixels[i] = sprite.pixels[i++];
        }
    }
    copySpriteBlendAlpha(sprite) {
        if (this.pixels.length !== sprite.pixels.length) {
            this.imageData = this.createImageData();
            this.pixels = this.imageData.data;
        }
        this.width = sprite.width;
        this.height = sprite.height;
        const o = new RGB(0, 0, 0, 0);
        const t = new RGB(0, 0, 0, 0);
        for (let i = 0; i < this.pixels.length; i += 4) {
            o.setRed(sprite.pixels[i]);
            o.setGreen(sprite.pixels[i + 1]);
            o.setBlue(sprite.pixels[i + 2]);
            o.setAlpha(sprite.pixels[i + 3]);
            t.setRed(this.pixels[i]);
            t.setGreen(this.pixels[i + 1]);
            t.setBlue(this.pixels[i + 2]);
            t.setAlpha(this.pixels[i + 3]);
            t.blendAlphaCopy(o);
            this.pixels[i] = t.red();
            this.pixels[i + 1] = t.green();
            this.pixels[i + 2] = t.blue();
            this.pixels[i + 3] = t.alpha();
        }
    }
    draw(ctx, x, y, width, height) {
        if (this.pixels) {
            if (this.fillBackground) {
                ctx.clearRect(x, y, width, height);
            }
            ctx.drawImage(this.image, x, y, width, height);
        }
    }
}
;
function sum(elements) {
    let sum = 0;
    for (let i = 0; i < elements.length; i++) {
        sum += elements[i];
    }
    return sum;
}
;
export function groupify(layout, layout_manager = new HorizontalLayoutManager([0, 0])) {
    const build_group = (sub_layout, type) => {
        if (sub_layout) {
            if (Array.isArray(sub_layout)) {
                const array = sub_layout;
                if (array.length) {
                    if (array[0].draw) {
                        const elements = array;
                        const hlayout = new type([4000, 4000]);
                        elements.forEach(el => hlayout.addElement(el));
                        layout_manager.addElement(hlayout.trimDim());
                    }
                    else {
                        const elements = array;
                        const hlayout = new type([4000, 4000]);
                        elements.forEach(el => {
                            hlayout.addElement(groupify(el, new type([4000, 4000])).trimDim());
                        });
                        layout_manager.addElement(hlayout);
                        hlayout.trimDim();
                    }
                }
            }
            else {
                layout_manager.addElement(groupify(sub_layout, new type([4000, 4000])).trimDim());
            }
        }
    };
    build_group(layout.h, HorizontalLayoutManager);
    build_group(layout.v, VerticalLayoutManager);
    if (layout.e) {
        layout_manager.addElement(layout.e);
    }
    layout_manager.trimDim();
    return layout_manager;
}
export function horizontal_group(elements, x = 0, y = 0) {
    let height = 0;
    const width = sum(elements.map(el => {
        if (el.height() > height)
            height = el.height();
        return el.width();
    }));
    const layout = new HorizontalLayoutManager([width, height], x, y);
    elements.forEach(el => layout.addElement(el));
    layout.trimDim();
    return layout;
}
export function vertical_group(elements, x = 0, y = 0) {
    let width = 0;
    const height = sum(elements.map(el => {
        if (el.width() > width)
            width = el.width();
        return el.height();
    }));
    const layout = new VerticalLayoutManager([width, height], x, y);
    elements.forEach(el => layout.addElement(el));
    layout.trimDim();
    return layout;
}
export class SpriteAnimation {
    constructor(x, y, width, height) {
        this.sprites = [];
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.animationIndex = 0;
    }
    pushSprite(sprite) {
        this.sprites.push(sprite);
    }
    binaryFileSize() {
        let size = 2;
        this.sprites.forEach((sprite) => size += sprite.binaryFileSize());
        return size;
    }
    toGifBlob(callBack, fps = 30) {
        const frameTime = 1000 / fps;
        const gif = new GIF({
            workers: 2,
            quality: 10
        });
        // add an image element
        for (let i = 0; i < this.sprites.length; i++)
            gif.addFrame(this.sprites[i].image, { delay: Math.ceil(frameTime) });
        gif.on('finished', function (blob) {
            callBack(blob);
        });
        gif.render();
    }
    saveToUint32Buffer(buf, index) {
        buf[index++] = this.binaryFileSize();
        buf[index++] = 2;
        this.sprites.forEach((sprite) => index = sprite.saveToUint32Buffer(buf, index));
        return index;
    }
    cloneAnimation() {
        const cloned = new SpriteAnimation(0, 0, this.width, this.height);
        const original = this;
        original.sprites.forEach((sprite) => {
            const clonedSprite = new Sprite([], sprite.width, sprite.height);
            clonedSprite.copySprite(sprite);
            clonedSprite.refreshImage();
            cloned.sprites.push(clonedSprite);
        });
        return cloned;
    }
    draw(ctx, x, y, width, height) {
        if (this.sprites.length) {
            ++this.animationIndex;
            this.sprites[this.animationIndex %= this.sprites.length].draw(ctx, x, y, width, height);
        }
        else {
            this.animationIndex = -1;
        }
    }
}
;
let width = Math.min(document.body.scrollWidth, document.documentElement.scrollWidth, document.body.offsetWidth, document.documentElement.offsetWidth, document.documentElement.clientWidth);
let height = Math.min(document.body.clientHeight);
window.addEventListener("resize", () => {
    width = Math.min(document.body.scrollWidth, document.documentElement.scrollWidth, document.body.offsetWidth, document.documentElement.offsetWidth, document.body.clientWidth);
    height = document.body.clientHeight;
});
let landscape = true;
setInterval(() => {
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    landscape = !(mediaQuery.matches);
}, 100);
export function is_landscape() {
    return landscape;
}
export function is_portrait() {
    return !landscape;
}
export function getWidth() {
    return !landscape ? Math.min(width, height) : Math.max(width, height);
}
export function getHeight() {
    return !landscape ? Math.max(width, height) : Math.min(width, height);
}
export class RegularPolygon {
    constructor(radius, sides) {
        this.points = [];
        this.sides = sides;
        if (sides <= 2)
            throw "Error polygon must have at least 3 sides";
        this.resize_radius(radius);
    }
    resize_radius(radius) {
        this.points = [];
        const side_length = 2 * radius * Math.sin(Math.PI / this.sides);
        const exterior_angle = (2 * Math.PI / this.sides);
        let xi = 0;
        let yi = 0;
        this.bounds = [max_32_bit_signed, max_32_bit_signed, -max_32_bit_signed, -max_32_bit_signed];
        for (let i = 0; i < this.sides; i++) {
            const dx = side_length * Math.cos(exterior_angle * i);
            const dy = side_length * Math.sin(exterior_angle * i);
            xi = xi + dx;
            yi = yi + dy;
            this.points.push(xi);
            this.points.push(yi);
            if (xi < this.bounds[0]) {
                this.bounds[0] = xi;
            }
            if (xi > this.bounds[2]) {
                this.bounds[2] = xi;
            }
            if (yi < this.bounds[1]) {
                this.bounds[1] = yi;
            }
            if (yi > this.bounds[3]) {
                this.bounds[3] = yi;
            }
        }
    }
    width() {
        return this.max_x() - this.min_x();
    }
    height() {
        return this.max_y() - this.min_y();
    }
    min_x() {
        return this.bounds[0];
    }
    max_x() {
        return this.bounds[2];
    }
    min_y() {
        return this.bounds[1];
    }
    max_y() {
        return this.bounds[3];
    }
    render(ctx, x, y) {
        ctx.moveTo(x - this.bounds[0], y);
        for (let i = 0; i < this.points.length; i += 2) {
            ctx.lineTo(this.points[i] - this.bounds[0] + x, this.points[i + 1] + y);
        }
        ctx.stroke();
    }
    render_funky(ctx, x, y) {
        ctx.moveTo(x - this.min_x(), y);
        for (let i = 0; i < this.points.length; i += 2) {
            ctx.lineTo(this.points[0] - this.min_x(), this.points[1] - this.min_x());
            ctx.lineTo(this.points[i] - this.min_x(), this.points[i + 1]);
        }
        ctx.stroke();
    }
}
;
export function render_regular_polygon(ctx, radius, sides, x, y) {
    if (sides <= 2)
        return;
    ctx.beginPath();
    const side_length = 2 * radius * Math.sin(Math.PI / sides);
    const exterior_angle = (2 * Math.PI / sides);
    let xi = 0;
    let yi = 0;
    let points = [];
    let lowest_x = 1000000;
    let bounds = [max_32_bit_signed, max_32_bit_signed, -1, -1];
    for (let i = 0; i < sides; i++) {
        const dx = side_length * Math.cos(exterior_angle * i);
        const dy = side_length * Math.sin(exterior_angle * i);
        xi = xi + dx;
        yi = yi + dy;
        points.push(xi + x);
        points.push(yi + y);
        if (xi < lowest_x) {
            lowest_x = xi;
        }
    }
    ctx.moveTo(x - lowest_x, y);
    for (let i = 0; i < points.length; i += 2) {
        ctx.lineTo(points[i] - lowest_x, points[i + 1]);
    }
    ctx.stroke();
}
export function render_funky_regular_polygon(ctx, radius, sides, x, y) {
    if (sides <= 2)
        return;
    ctx.beginPath();
    const side_length = 2 * radius * Math.sin(Math.PI / sides);
    const exterior_angle = (2 * Math.PI / sides);
    let xi = 0;
    let yi = 0;
    let points = [];
    let lowest_x = 1000000;
    for (let i = 0; i < sides; i++) {
        const dx = side_length * Math.cos(exterior_angle * i);
        const dy = side_length * Math.sin(exterior_angle * i);
        xi = xi + dx;
        yi = yi + dy;
        points.push(xi + x);
        points.push(yi + y);
        if (xi < lowest_x) {
            lowest_x = xi;
        }
    }
    ctx.moveTo(x - lowest_x, y);
    for (let i = 0; i < points.length; i += 2) {
        ctx.lineTo(points[0] - lowest_x, points[1] - lowest_x);
        ctx.lineTo(points[i] - lowest_x, points[i + 1]);
    }
    ctx.stroke();
}
