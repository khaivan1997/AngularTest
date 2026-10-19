import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EhTag } from '../eh-tag/eh-tag';
import { TemplateStore } from '../../store/template-store';

@Component({
  selector: 'app-template-view',
  standalone: true,
  imports: [EhTag],
  templateUrl: './template-view.html',
  styleUrl: './template-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateView {
  protected readonly templateStore = inject(TemplateStore);
  protected readonly templates = this.templateStore.templates;

  protected onDragStart(event: DragEvent, templateId: string): void {
    const dataTransfer = event.dataTransfer;

    if (!dataTransfer) {
      return;
    }

    dataTransfer.effectAllowed = 'copy';
    dataTransfer.setData('application/x-template-id', templateId);
  }
}
