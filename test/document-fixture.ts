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
import { when } from 'jest-when';

interface DocumentFixture {
  setupForTest(globalScope: typeof globalThis): void;
  teardownForTest(globalScope: typeof globalThis): void;
}

const defaultComment = {
  content: 'comment',
  author: {
    displayName: 'John Doe',
  },
  deleted: false,
  resolved: false,
};

const defaultReply = {
  content: 'comment',
  author: {
    displayName: 'John Doe',
  },
  deleted: false,
  action: null,
};

export function getComment(overrides: any = {}, replies: any[] = []) {
  return {
    ...defaultComment,
    ...overrides,
    author: { ...defaultComment.author, ...overrides.author },
    replies: replies,
  };
}

export function getReply(overrides: any = {}) {
  return {
    ...defaultReply,
    ...overrides,
    author: { ...defaultReply.author, ...overrides.author },
  };
}

export class DocumentWithTextAnchor implements DocumentFixture {
  readonly documentId = 'mock-id-123';
  gsDrive = {} as any;
  gsDocumentApp = {} as any;
  listCommentFn = jest.fn();
  getActiveDocumentFn = jest.fn();
  getDocumentIdFn = jest.fn();

  constructor() {
    this.setupMockFns();
    this.setupMockGlobals();
  }

  private setupMockFns() {
    this.getActiveDocumentFn.mockReturnValue({
      getId: this.getDocumentIdFn,
    });
    this.getDocumentIdFn.mockReturnValue(this.documentId);
    when(this.listCommentFn)
      .calledWith(this.documentId, {
        pageToken: undefined,
        includeDeleted: true,
        fields: expect.anything(),
      })
      .mockReturnValue({
        comments: [
          getComment(
            {
              content: '@x@x.com(John),reviewer,CEO',
              resolved: true,
              author: { displayName: 'Me' },
            },
            [getReply({ action: 'resolve', author: { displayName: 'John' } })]
          ),
          getComment({
            content: '@y@x.com(Ximi),reviewer,CFO',
            resolved: false,
            author: { displayName: 'Me' },
          }),
          getComment({
            content: '@z@x.com(Kate),approver,CTO',
            resolved: false,
            author: { displayName: 'Me' },
          }),
          getComment({
            content: '@j@x.com(Jeff),reviewer,Janitor',
            resolved: false,
            deleted: true,
            author: { displayName: 'Me' },
          }),
          getComment({
            content: 'Check this line you got a typo',
            author: { displayName: 'John' },
          }),
        ],
        nextPageToken: 'page2',
      });
    when(this.listCommentFn)
      .calledWith(this.documentId, {
        pageToken: 'page2',
        includeDeleted: true,
        fields: expect.anything(),
      })
      .mockReturnValue({
        comments: [
          getComment({
            content: 'We need to get a better revenue estimate here',
            author: { displayName: 'Ximi' },
          }),
          getComment({
            content: '@secure@x.com(Vlad),approver,Security',
            resolved: false,
            author: { displayName: 'Me' },
          }),
          getComment(
            {
              content: 'A spare key needs to be kept in the safe',
              resolved: true,
              author: { displayName: 'Vlad' },
            },
            [getReply({ action: 'resolve', author: { displayName: 'Vlad' } })]
          ),
        ],
      });
  }

  private setupMockGlobals() {
    this.gsDrive = {
      Comments: {
        list: this.listCommentFn,
      },
    };
    this.gsDocumentApp = {
      getActiveDocument: this.getActiveDocumentFn,
    };
  }

  public setupForTest(globalScope: typeof globalThis): void {
    globalScope.Drive = this.gsDrive;
    globalScope.DocumentApp = this.gsDocumentApp;
  }

  public teardownForTest(globalScope: typeof globalThis): void {
    globalScope.Drive = {} as any;
    globalScope.DocumentApp = {} as any;
  }
}

class DocumentWithReviewTable implements DocumentFixture {
  public setupForTest(globalScope: typeof globalThis): void {}

  public teardownForTest(globalScope: typeof globalThis): void {}
}
