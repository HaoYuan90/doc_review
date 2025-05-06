/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @preserve
 * @OnlyCurrentDoc
 */
import { processAllComments } from './comment-module';
import {
  getDocReviewInsertionPoint,
  insertDocReviewTable,
} from './doc-module';

function onOpen(_e: any) {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Menu', 'showSidebar')
    .addToUi();
  const reviewerInfo = processAllComments();
  const anchor = getDocReviewInsertionPoint();
  if (anchor) {
    insertDocReviewTable(anchor, reviewerInfo);
  } else {
    const currReviewerInfo = []; // TODO: get reviewer info from document
    // TODO: If stored reviewer information does not agree with comments, update
    // otherwise pass through
  }
}

function onInstall(e: any) {
  onOpen(e);
}

function showSidebar() {
  const ui = HtmlService.createTemplateFromFile('ui')
    .evaluate()
    .setTitle('Doc Review');
  DocumentApp.getUi().showSidebar(ui);
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function include(filename: string) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
