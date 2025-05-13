import {
  internal,
  ReviewerInfo,
  ReviewerType,
  ReviewStatus,
  processAllComments,
} from '../src/comment-module';
import {
  getComment,
  getReply,
  DocumentWithTextAnchor,
} from './document-fixture';

const { parseReviewerInfo } = internal;

describe('comment-module', () => {
  describe('parseReviewerInfo', () => {
    it('extracts information from standard comments', () => {
      expect(
        parseReviewerInfo('@email@gmail.com(Xiao Ming),reviewer,team 1')
      ).toEqual({
        email: 'email@gmail.com',
        name: 'Xiao Ming',
        type: ReviewerType.Reviewer,
        team: 'team 1',
      } as ReviewerInfo);
      expect(
        parseReviewerInfo('@x@exchange.edu(John Jane Doe),approver,alpha team')
      ).toEqual({
        email: 'x@exchange.edu',
        name: 'John Jane Doe',
        type: ReviewerType.Approver,
        team: 'alpha team',
      } as ReviewerInfo);
      expect(parseReviewerInfo('@x@m.ai(John),approver,x')).toEqual({
        email: 'x@m.ai',
        name: 'John',
        type: ReviewerType.Approver,
        team: 'x',
      } as ReviewerInfo);
    });

    it('extracts reviewer type ignoring upper/lower case', () => {
      expect(
        parseReviewerInfo('@email@gmail.com(Xiao Ming),REVIEWER,team 1')!.type
      ).toEqual(ReviewerType.Reviewer);
      expect(
        parseReviewerInfo('@email@gmail.com(Xiao Ming),reVIEWER,team 1')!.type
      ).toEqual(ReviewerType.Reviewer);
      expect(
        parseReviewerInfo('@email@gmail.com(Xiao Ming),APPROVER,team 1')!.type
      ).toEqual(ReviewerType.Approver);
      expect(
        parseReviewerInfo('@email@gmail.com(Xiao Ming),APPROver,team 1')!.type
      ).toEqual(ReviewerType.Approver);
    });

    it('extracts information from comments with spaces', () => {
      const expectedMatch: ReviewerInfo = {
        email: 'email@gmail.com',
        name: 'Xiao Ming',
        type: ReviewerType.Reviewer,
        team: 'team 1',
      };
      expect(
        parseReviewerInfo('@email@gmail.com (Xiao Ming),reviewer,team 1')
      ).toEqual(expectedMatch);
      expect(
        parseReviewerInfo('@email@gmail.com( Xiao Ming),reviewer,team 1')
      ).toEqual(expectedMatch);
      expect(
        parseReviewerInfo('@email@gmail.com(Xiao Ming) ,reviewer,team 1')
      ).toEqual(expectedMatch);
      expect(
        parseReviewerInfo('@email@gmail.com(Xiao Ming), reviewer,team 1')
      ).toEqual(expectedMatch);
      expect(
        parseReviewerInfo('@email@gmail.com(Xiao Ming),reviewer , team 1')
      ).toEqual(expectedMatch);
      expect(
        parseReviewerInfo('@email@gmail.com ( Xiao Ming ) , reviewer, team 1')
      ).toEqual(expectedMatch);
    });

    it('returns null for comments not matching format', () => {
      // Single letter domain after dot
      expect(
        parseReviewerInfo('@x@ai.a(Xiao Ming),reviewer,team 1')
      ).toBeNull();
      // No starting @
      expect(
        parseReviewerInfo('email@gmail.com(Xiao Ming),reviewer,team')
      ).toBeNull();
      // No name
      expect(parseReviewerInfo('@email@gmail.com,reviewer,team')).toBeNull();
      // Name not enclosed by brackets
      expect(
        parseReviewerInfo('@email@gmail.com Xiao Ming,reviewer,team')
      ).toBeNull();
      // Invalid reviewer type
      expect(
        parseReviewerInfo('@email@gmail.com(Xiao Ming),review,team')
      ).toBeNull();
      // No team
      expect(
        parseReviewerInfo('@email@gmail.com(Xiao Ming),reviewer')
      ).toBeNull();
      // Empty team
      expect(
        parseReviewerInfo('@email@gmail.com(Xiao Ming),reviewer,')
      ).toBeNull();
    });
  });

  describe('processAllComments', () => {
    describe('with mocked APIs', () => {
      beforeEach(() => {
        globalThis.Drive = {
          Comments: {
            list: jest.fn(),
          } as any,
        } as any;

        globalThis.DocumentApp = {
          getActiveDocument: jest.fn(() => {
            return {
              getId: jest.fn(() => 'mocked current document id'),
            };
          }),
        } as any;
      });

      afterEach(() => {
        globalThis.Drive = {} as any;
        globalThis.DocumentApp = {} as any;
      });

      it('processes unactioned review', () => {
        Drive.Comments.list = jest.fn(() => {
          return {
            comments: [
              getComment({
                content: '@x@x.com(John),reviewer,CEO',
                author: { displayName: 'Me' },
              }),
            ],
            nextPageToken: undefined,
          };
        });

        expect(processAllComments()).toEqual([
          {
            info: {
              email: 'x@x.com',
              name: 'John',
              type: ReviewerType.Reviewer,
              team: 'CEO',
            },
            status: ReviewStatus.NotStarted,
          },
        ]);
      });

      it('processes ongoing review', () => {
        Drive.Comments.list = jest.fn(() => {
          return {
            comments: [
              getComment({
                content: '@x@x.com(John),reviewer,CEO',
                author: { displayName: 'Me' },
              }),
              getComment({
                content: 'Check this line you got a typo',
                author: { displayName: 'John' },
              }),
            ],
            nextPageToken: undefined,
          };
        });

        expect(processAllComments()).toEqual([
          {
            info: {
              email: 'x@x.com',
              name: 'John',
              type: ReviewerType.Reviewer,
              team: 'CEO',
            },
            status: ReviewStatus.InProgress,
          },
        ]);
      });

      it('processes resolved review', () => {
        Drive.Comments.list = jest.fn(() => {
          return {
            comments: [
              getComment(
                {
                  content: '@x@x.com(John),reviewer,CEO',
                  resolved: true,
                  author: { displayName: 'Me' },
                },
                [
                  getReply({
                    action: 'resolve',
                    author: { displayName: 'John' },
                  }),
                ]
              ),
              getComment({
                content: 'Check this line you got a typo',
                author: { displayName: 'John' },
              }),
            ],
            nextPageToken: undefined,
          };
        });

        expect(processAllComments()).toEqual([
          {
            info: {
              email: 'x@x.com',
              name: 'John',
              type: ReviewerType.Reviewer,
              team: 'CEO',
            },
            status: ReviewStatus.Approved,
          },
        ]);
      });

      it('ignores deleted review request', () => {
        Drive.Comments.list = jest.fn(() => {
          return {
            comments: [
              getComment({
                content: '@x@x.com(John),reviewer,CEO',
                deleted: true,
                author: { displayName: 'Me' },
              }),
            ],
            nextPageToken: undefined,
          };
        });

        expect(processAllComments()).toEqual([]);
      });

      it('ignores deleted comment', () => {
        Drive.Comments.list = jest.fn(() => {
          return {
            comments: [
              getComment({
                content: '@x@x.com(John),reviewer,CEO',
                author: { displayName: 'Me' },
              }),
              getComment({
                content: 'Check this line you got a typo',
                deleted: true,
                author: { displayName: 'John' },
              }),
            ],
            nextPageToken: undefined,
          };
        });

        expect(processAllComments()).toEqual([
          {
            info: {
              email: 'x@x.com',
              name: 'John',
              type: ReviewerType.Reviewer,
              team: 'CEO',
            },
            status: ReviewStatus.NotStarted,
          },
        ]);
      });

      it('ignores review request resolved by other than the reviewer requested', () => {
        Drive.Comments.list = jest.fn(() => {
          return {
            comments: [
              getComment(
                {
                  content: '@x@x.com(John),reviewer,CEO',
                  resolved: true,
                  author: { displayName: 'Me' },
                },
                [getReply({ action: 'resolve', author: { displayName: 'Me' } })]
              ),
            ],
            nextPageToken: undefined,
          };
        });

        expect(processAllComments()).toEqual([
          {
            info: {
              email: 'x@x.com',
              name: 'John',
              type: ReviewerType.Reviewer,
              team: 'CEO',
            },
            status: ReviewStatus.NotStarted,
          },
        ]);
      });
    });

    describe('with mocked document', () => {
      const md = new DocumentWithTextAnchor();
      beforeEach(() => {
        md.setupForTest(globalThis);
      });
      afterEach(() => {
        md.teardownForTest(globalThis);
      });

      it('processes mixed review requests and statuses', () => {
        expect(processAllComments()).toEqual([
          {
            info: {
              email: 'x@x.com',
              name: 'John',
              type: ReviewerType.Reviewer,
              team: 'CEO',
            },
            status: ReviewStatus.Approved,
          },
          {
            info: {
              email: 'z@x.com',
              name: 'Kate',
              type: ReviewerType.Approver,
              team: 'CTO',
            },
            status: ReviewStatus.NotStarted,
          },
          {
            info: {
              email: 'secure@x.com',
              name: 'Vlad',
              type: ReviewerType.Approver,
              team: 'Security',
            },
            status: ReviewStatus.InProgress,
          },
          {
            info: {
              email: 'y@x.com',
              name: 'Ximi',
              type: ReviewerType.Reviewer,
              team: 'CFO',
            },
            status: ReviewStatus.InProgress,
          },
        ]);
      });
    });
  });
});
