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

import './comment-module'; // Package module into Apps Script bundle
import './doc-module'; // Package module into Apps Script bundle
import './ui-service'; // Package module into Apps Script bundle

function onOpen(_e: any) {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Menu', 'showSidebar')
    .addToUi();
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
