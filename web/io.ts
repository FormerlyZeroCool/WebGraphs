
export class KeyListenerTypes {
    keydown:Array<TouchHandler>;
    keypressed:Array<TouchHandler>;
    keyup:Array<TouchHandler>;
    constructor()
    {
        this.keydown = new Array<TouchHandler>();
        this.keypressed = new Array<TouchHandler>();
        this.keyup = new Array<TouchHandler>();
    }
};
export class KeyboardHandler {
    keysHeld:any;
    listenerTypeMap:KeyListenerTypes;
    constructor()
    {
        this.keysHeld = {};
        this.listenerTypeMap = new KeyListenerTypes();
        document.addEventListener("keyup", (e:any) => this.keyUp(e));
        document.addEventListener("keydown", (e:any) => this.keyDown(e));
        document.addEventListener("keypressed", (e:any) => this.keyPressed(e));
    }
    registerCallBack(listenerType:string, predicate:(event:any) => boolean, callBack:(event:any) => void):void
    {
        (<any> this.listenerTypeMap)[listenerType].push(new TouchHandler(predicate, callBack));
    }
    callHandler(type:string, event:any):void
    {
        const handlers:TouchHandler[] = (<any> this.listenerTypeMap)[type];
        handlers.forEach((handler:TouchHandler) => {
            if(handler.pred(event))
            {
                handler.callBack(event);
            }
        });
    }
    keyDown(event:any)
    {
        if(this.keysHeld[event.code] === undefined || this.keysHeld[event.code] === null)
            this.keysHeld[event.code] = 1;
        else
            this.keysHeld[event.code]++;
        event.keysHeld = this.keysHeld;
        this.callHandler("keydown", event);
    }
    keyUp(event:any)
    {
        this.keysHeld[event.code] = 0;
        event.keysHeld = this.keysHeld;
        this.callHandler("keyup", event);
    }
    keyPressed(event:any)
    {
        event.keysHeld = this.keysHeld;
        this.callHandler("keypressed", event);
    }
    
};
export class TouchHandler {
    pred:(event:any) => boolean; 
    callBack:(event:any) => void;
    constructor(pred:(event:any) => boolean, callBack:(event:any) => void)
    {
        this.pred = pred;
        this.callBack = callBack;
    }
};
export class ListenerTypes {
    touchstart:Array<TouchHandler>;
    touchmove:Array<TouchHandler>;
    touchend:Array<TouchHandler>;
    constructor()
    {
        this.touchstart = new Array<TouchHandler>();
        this.touchmove = new Array<TouchHandler>();
        this.touchend = new Array<TouchHandler>();
    }
};
export interface TouchMoveEvent {

    deltaX:number;
    deltaY:number;
    mag:number;
    angle:number;
    avgVelocity:number;
    touchPos:number[];
    startTouchTime:number;
    eventTime:number;
    moveCount:number;

};
export function isTouchSupported():boolean {
    return (('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0));
}
export class MouseDownTracker {
    mouseDown:boolean;
    count:number | null;
    constructor()
    {
        const component = document;
        this.mouseDown = false;
        this.count = null;
        if(isTouchSupported())
        {
            this.count = 0;
            component.addEventListener('touchstart', event => { this.mouseDown = true; this.count!++; }, false);
            component.addEventListener('touchend', event => { this.mouseDown = false; this.count!--; }, false);
        }
        if(!isTouchSupported()){
            component.addEventListener('mousedown', event => this.mouseDown = true );
            component.addEventListener('mouseup', event => this.mouseDown = false );
    
        }
    }
    getTouchCount(): number
    { return this.count!; }
}
export class SingleTouchListener
{
    startTouchTime:number;
    startTouchTime:number;
    timeSinceLastTouch:number;
    moveCount:number;
    preventDefault:any;
    touchStart:any;
    registeredTouch:boolean;
    static mouseDown:MouseDownTracker = new MouseDownTracker();
    touchPos:Array<number>;
    startTouchPos:number[];
    offset:Array<number>;
    touchVelocity:number;
    touchMoveCount:number;
    deltaTouchPos:number;
    listenerTypeMap:ListenerTypes;
    component:HTMLElement;
    touchMoveEvents:TouchMoveEvent[];
    mouseOverElement:boolean;
    translateEvent:(event:any, dx:number, dy:number) => void;
    scaleEvent:(event:any, dx:number, dy:number) => void;
    constructor(component:HTMLElement | null, preventDefault:boolean, mouseEmulation:boolean, stopRightClick:boolean = false)
    {
        this.startTouchTime = Date.now();
        this.timeSinceLastTouch = Date.now() - this.startTouchTime;
        this.offset = [];
        this.moveCount = 0;
        this.touchMoveEvents = [];
        this.translateEvent = (e:any, dx:number, dy:number) => e.touchPos = [e.touchPos[0] + dx, e.touchPos[1] + dy];
        this.scaleEvent = (e:any, dx:number, dy:number) => e.touchPos = [e.touchPos[0] * dx, e.touchPos[1] * dy];
        this.startTouchPos = [0, 0];
        this.component = component!;
        this.preventDefault = preventDefault;
        this.touchStart = null;
        this.registeredTouch = false;
        this.touchPos = [0,0];
        this.touchVelocity = 0;
        this.touchMoveCount = 0;
        this.deltaTouchPos = 0;
        this.listenerTypeMap = {
            touchstart:[],
            touchmove:[],
            touchend:[]
        };
        this.mouseOverElement = false;
        if(component)
        {
            if(isTouchSupported())
            {
                component.addEventListener('touchstart', (event:any) => {this.touchStartHandler(event);}, false);
                component.addEventListener('touchmove', (event:any) => this.touchMoveHandler(event), false);
                component.addEventListener('touchend', (event:any) => this.touchEndHandler(event), false);
            }
            if(mouseEmulation && !isTouchSupported()){
                if(stopRightClick)
                    component.addEventListener("contextmenu", (e:any) => {
                        e.preventDefault();
                        return false;
                    });
                component.addEventListener("mouseover", (event:any) => { this.mouseOverElement = true;});
                component.addEventListener("mouseleave", (event:any) => { this.mouseOverElement = false;});
                component.addEventListener('mousedown', (event:any) => {(<any>event).changedTouches = {};(<any>event).changedTouches.item = (x:any) => event; this.touchStartHandler(event)});
                component.addEventListener('mousemove', (event:any) => {
                    (<any>event).changedTouches = {};(<any>event).changedTouches.item = (x:any) => event; this.touchMoveHandler(event)
                });
                component.addEventListener('mouseup', (event:any) => {(<any>event).changedTouches = {};(<any>event).changedTouches.item = (x:any) => event; this.touchEndHandler(event)});
        
            }
        }
    }
    registerCallBack(listenerType:string, predicate:(event:any) => boolean, callBack:(event:any) => void):void
    {
        (<any> this.listenerTypeMap)[listenerType].push(new TouchHandler(predicate, callBack));
    }
    callHandler(type:string, event:any):void
    {
        const handlers:TouchHandler[] = (<any> this.listenerTypeMap)[type];
        const touchSupported:boolean = isTouchSupported();
        if(SingleTouchListener.mouseDown.getTouchCount() < 2)
        handlers.forEach((handler:TouchHandler) => {
            if((!event.defaultPrevented || touchSupported) && handler.pred(event))
            {
                handler.callBack(event);
            }
        });
        
    }
    touchStartHandler(event:any):void
    {
        this.timeSinceLastTouch = Date.now() - this.startTouchTime;
        this.registeredTouch = true;
        this.moveCount = 0;
        event.timeSinceLastTouch = Date.now() - (this.startTouchTime?this.startTouchTime:0);
        this.startTouchTime = Date.now();
        this.touchStart = event.changedTouches.item(0);
        this.touchPos = [this.touchStart["offsetX"],this.touchStart["offsetY"]];
        if(!this.touchPos[0]){
            this.touchPos = [this.touchStart["clientX"] - this.component.getBoundingClientRect().left, this.touchStart["clientY"] - this.component.getBoundingClientRect().top];
        }
        this.startTouchPos = [this.touchPos[0], this.touchPos[1]];
        event.touchPos = this.touchPos ? [this.touchPos[0], this.touchPos[1]] : [0,0];
        event.translateEvent = this.translateEvent;
        event.scaleEvent = this.scaleEvent;
        this.touchMoveEvents = [];
        this.touchVelocity = 0;
        this.touchMoveCount = 0;
        this.deltaTouchPos = 0;
        this.callHandler("touchstart", event);

        if(this.preventDefault)
            event.preventDefault();
    }
    touchMoveHandler(event:any):boolean
    {
        if(this.registeredTouch !== SingleTouchListener.mouseDown.mouseDown){
            this.touchEndHandler(event);
        }
        let touchMove = event.changedTouches.item(0);
        for(let i = 0; i < event.changedTouches["length"]; i++)
        {
            if(event.changedTouches.item(i).identifier == this.touchStart.identifier){
                touchMove = event.changedTouches.item(i);
            }
        }  
        
        if(touchMove)
        {
            try{
                if(!touchMove["offsetY"])
                {
                    touchMove.offsetY = touchMove["clientY"] - this.component.getBoundingClientRect().top;
                }
                if(!touchMove["offsetX"])
                {
                    touchMove.offsetX = touchMove["clientX"] - this.component.getBoundingClientRect().left;
                }
            }
            catch(error:any)
            {
                console.log(error);
            }
            const deltaY:number = touchMove["offsetY"]-this.touchPos[1];
            const deltaX:number = touchMove["offsetX"]-this.touchPos[0];
            this.touchPos[1] += deltaY;
            this.touchPos[0] += deltaX;
            if(!this.registeredTouch)
                 return false;
             ++this.moveCount;
            const mag:number = this.mag([deltaX, deltaY]);
            this.touchMoveCount++;
            this.deltaTouchPos += Math.abs(mag);
            this.touchVelocity = 100*this.deltaTouchPos/(Date.now() - this.startTouchTime); 
            const a:Array<number> = this.normalize([deltaX, deltaY]);
            const b:Array<number> = [1,0];
            const dotProduct:number = this.dotProduct(a, b);
            const angle:number = Math.acos(dotProduct)*(180/Math.PI)*(deltaY<0?1:-1);
            event.deltaX = deltaX;
            event.startTouchPos = this.startTouchPos;
            event.deltaY = deltaY;
            event.mag = mag;
            event.angle = angle;
            event.avgVelocity = this.touchVelocity;
            event.touchPos = this.touchPos ? [this.touchPos[0], this.touchPos[1]] : [0,0];
            event.startTouchTime = this.startTouchTime;
            event.eventTime = Date.now();
            event.moveCount = this.moveCount;
            event.translateEvent = this.translateEvent;
            event.scaleEvent = this.scaleEvent;
            this.touchMoveEvents.push(event);
            this.callHandler("touchmove", event);
        }
        return true;
    }
    touchEndHandler(event:any):void
    {
        if(this.registeredTouch)
        {
            let touchEnd = event.changedTouches.item(0);
            for(let i = 0; i < event.changedTouches["length"]; i++)
            {
                if(event.changedTouches.item(i).identifier === this.touchStart.identifier){
                    touchEnd = event.changedTouches.item(i);
                }
            } 
            if(touchEnd)
            {
                if(!touchEnd["offsetY"])
                {
                    touchEnd.offsetY = touchEnd["clientY"] - this.component.getBoundingClientRect().top;
                }if(!touchEnd["offsetX"])
                {
                    touchEnd.offsetX = touchEnd["clientX"] - this.component.getBoundingClientRect().left;
                }
                const deltaY:number = touchEnd["offsetY"] - this.startTouchPos[1];

                const deltaX:number = touchEnd["offsetX"] - this.startTouchPos[0];
                this.touchPos = [touchEnd["offsetX"], touchEnd["offsetY"]];
                const mag:number = this.mag([deltaX, deltaY]);
                const a:Array<number> = this.normalize([deltaX, deltaY]);
                const b:Array<number> = [1,0];
                const dotProduct:number = this.dotProduct(a, b);
                const angle:number = Math.acos(dotProduct)*(180/Math.PI)*(deltaY<0?1:-1);
                const delay:number = Date.now()-this.startTouchTime;// from start tap to finish
                this.touchVelocity = 100*mag/(Date.now()-this.startTouchTime)

                event.deltaX = deltaX;
                event.deltaY = deltaY;
                event.mag = mag;
                event.angle = angle;
                event.avgVelocity = this.touchVelocity;
                event.touchPos = this.touchPos ? [this.touchPos[0], this.touchPos[1]] : [0,0];
                event.timeDelayFromStartToEnd = delay;
                event.startTouchTime = this.startTouchTime;
                event.eventTime = Date.now();
                event.moveCount = this.moveCount;
                event.translateEvent = this.translateEvent;
                event.scaleEvent = this.scaleEvent;
                
                try 
                {
                    this.callHandler("touchend", event);
                } 
                catch(error:any)
                {
                    console.log(error);
                    this.registeredTouch = false;
                }
            }
            this.touchMoveEvents = [];
            this.registeredTouch = false;
        }
    }
    mag(a:number[]):number
    {
        return Math.sqrt(a[0]*a[0]+a[1]*a[1]);
    }
    normalize(a:number[]):Array<number>
    {
        const magA = this.mag(a);
        a[0] /= magA;
        a[1] /= magA;
        return a;
    }
    dotProduct(a:number[], b:number[]):number
    {
        return a[0]*b[0]+a[1]*b[1];
    }
};
export class MultiTouchListenerTypes {
    pinchOut:Array<TouchHandler>;
    pinchIn:Array<TouchHandler>;
    constructor(){
        this.pinchIn = [];
        this.pinchOut = [];
    }
};
export class MultiTouchListener {
    lastDistance:number;
    listenerTypeMap:MultiTouchListenerTypes;
    registeredMultiTouchEvent:boolean
    constructor(component:HTMLElement)
    {
        this.lastDistance = 0;
        this.listenerTypeMap = new MultiTouchListenerTypes();
        this.registeredMultiTouchEvent = false;
        if(isTouchSupported())
        {
            component.addEventListener('touchmove', event => this.touchMoveHandler(event), false);
            component.addEventListener('touchend', event => {this.registeredMultiTouchEvent = false; this.lastDistance = 0; event.preventDefault()}, false);
        }
    }    
    registerCallBack(listenerType:string, predicate:(event:any) => boolean, callBack:(event:any) => void):void
    {
        (<any> this.listenerTypeMap)[listenerType].push(new TouchHandler(predicate, callBack));
    }
    callHandler(type:string, event:any):void
    {
        const handlers:TouchHandler[] = (<any>this.listenerTypeMap)[type];
        handlers.forEach((handler:TouchHandler) => {
            if(!event.defaultPrevented && handler.pred(event))
            {
                handler.callBack(event);
            }
        });
    }
    touchMoveHandler(event:any):void
    {
        const touch1 = event.changedTouches.item(0);
        const touch2 = event.changedTouches.item(1);
        if(SingleTouchListener.mouseDown.getTouchCount() > 1)
        {
            this.registeredMultiTouchEvent = true;
            if(this.lastDistance === 0)
                this.lastDistance = Math.sqrt(Math.pow((touch1.clientX - touch2.clientX),2) + Math.pow(touch1.clientY - touch2.clientY, 2));
        }
        if(this.registeredMultiTouchEvent)
        {
            const newDist:number = Math.sqrt(Math.pow((touch1.clientX - touch2.clientX),2) + Math.pow(touch1.clientY - touch2.clientY, 2));
            event.delta = this.lastDistance - newDist;
            if(this.lastDistance > newDist)
            {
                this.callHandler("pinchOut", event);
            }
            else
            {
                this.callHandler("pinchIn", event);
            }
            event.preventDefault();
            this.lastDistance = newDist;
        }
    }
};


export async function fetchImage(url:string):Promise<HTMLImageElement>
{
    const img = new Image();
    img.src =  URL.createObjectURL(await (await fetch(url)).blob());
    return img;
}