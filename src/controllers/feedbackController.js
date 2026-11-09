// Controller：回報資訊錯誤。症狀頁和育兒資源頁共用。
import { channels, validate, toPayload, toText, submitToApi } from '../models/feedbackModel.js';
import { FeedbackView } from '../views/shared/feedbackView.js';

/** @returns {(context: { page: 'SYMPTOM'|'RESOURCE', code?: string, name?: string }) => void} 打開回報視窗的函式 */
export function createFeedback() {
  let context = null;
  const ch = channels();

  const view = new FeedbackView({
    async onSubmit(values) {
      const errors = validate(values);
      view.showErrors(errors);
      if (Object.keys(errors).length || !ch.api) return;
      view.setBusy(true);
      try {
        await submitToApi(ch.api, toPayload(context, values));
        view.showDone();
      } catch (err) {
        view.showErrors(err.errors ?? {});
        view.showStatus(err.message, 'err');
        view.setBusy(false);
      }
    },
    async onCopy(values) {
      const errors = validate(values);
      view.showErrors(errors);
      if (Object.keys(errors).length) return;
      try {
        await navigator.clipboard.writeText(toText(context, values));
        view.showStatus('已複製，請貼到表單或 LINE 訊息裡送出。');
      } catch {
        view.showStatus('瀏覽器不允許自動複製，請自行選取文字複製。', 'err');
      }
    },
  });

  return (ctx) => {
    context = ctx;
    view.open(ctx, ch);
  };
}
