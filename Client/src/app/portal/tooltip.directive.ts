import {
    Directive,
    Output,
    Input,
    EventEmitter,
    HostBinding,
    HostListener
  } from '@angular/core';
  
  @Directive({
    selector: '[appTooltip]'
  })
  export class TooltipDirective {
    @HostBinding('class.tooltip') Tooltip: boolean | undefined;
    @Output() tooltipEvent = new EventEmitter<any>();
    node:any
    targetElement:any
  
    @HostListener('mouseenter',['$event']) public onmouseenter(evt:any){
        if(document.body.querySelectorAll('.tooltips').length == 0){
          this.node = document.createElement("div");
          this.node.classList.add("tooltips");
           this.targetElement = evt.target.getBoundingClientRect();
          this.node.style.top = (this.targetElement.y) + 'px';
          this.node.style.left = this.targetElement.x + 'px';
          this.node.style.transform = 'transform(50%,100%)';
          this.node.innerHTML = evt.target.querySelectorAll('.targetTooltip')!=undefined?evt.target.querySelectorAll('.targetTooltip')[0]?.innerHTML:evt.target.innerHTML;
          document.body.appendChild(this.node);
        }else{
          this.node.style.top = evt.pageY + 'px';
          this.node.style.left = evt.pageX + 'px';
        }
      }
      @HostListener('mouseleave',['$event']) public onmouseleave(evt:any){
        document.body.querySelectorAll('.tooltips').forEach(element => {
          element.remove();
        });
  
      }
    }