import { internal, ReviewerInfo, ReviewerType } from '../src/comment-module';

const { parseReviewerInfo } = internal;

describe('comment-module', () => {
  describe('parseReviewerInfo', () => {
    it('extracts information from standard comments', () => {
      expect(parseReviewerInfo('@email@gmail.com(Xiao Ming),reviewer,team 1')).toEqual({
        email: 'email@gmail.com',
        name: 'Xiao Ming',
        type: ReviewerType.Reviewer,
        team: 'team 1',
      } as ReviewerInfo);
      expect(parseReviewerInfo('@x@exchange.edu(John Jane Doe),approver,alpha team')).toEqual({
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
      expect(parseReviewerInfo('@email@gmail.com(Xiao Ming),REVIEWER,team 1')!.type).toEqual(ReviewerType.Reviewer);
      expect(parseReviewerInfo('@email@gmail.com(Xiao Ming),reVIEWER,team 1')!.type).toEqual(ReviewerType.Reviewer);
      expect(parseReviewerInfo('@email@gmail.com(Xiao Ming),APPROVER,team 1')!.type).toEqual(ReviewerType.Approver);
      expect(parseReviewerInfo('@email@gmail.com(Xiao Ming),APPROver,team 1')!.type).toEqual(ReviewerType.Approver);
    });

    it('extracts information from comments with spaces', () => {
      const expectedMatch: ReviewerInfo = {
        email: 'email@gmail.com',
        name: 'Xiao Ming',
        type: ReviewerType.Reviewer,
        team: 'team 1',
      };
      expect(parseReviewerInfo('@email@gmail.com (Xiao Ming),reviewer,team 1')).toEqual(expectedMatch);
      expect(parseReviewerInfo('@email@gmail.com( Xiao Ming),reviewer,team 1')).toEqual(expectedMatch);
      expect(parseReviewerInfo('@email@gmail.com(Xiao Ming) ,reviewer,team 1')).toEqual(expectedMatch);
      expect(parseReviewerInfo('@email@gmail.com(Xiao Ming), reviewer,team 1')).toEqual(expectedMatch);
      expect(parseReviewerInfo('@email@gmail.com(Xiao Ming),reviewer , team 1')).toEqual(expectedMatch);
      expect(parseReviewerInfo('@email@gmail.com ( Xiao Ming ) , reviewer, team 1')).toEqual(expectedMatch);
    });

    it('returns null for comments not matching format', () => {
      // Single letter domain after dot
      expect(parseReviewerInfo('@x@ai.a(Xiao Ming),reviewer,team 1')).toBeNull();
      // No starting @
      expect(parseReviewerInfo('email@gmail.com(Xiao Ming),reviewer,team')).toBeNull();
      // No name
      expect(parseReviewerInfo('@email@gmail.com,reviewer,team')).toBeNull();
      // Name not enclosed by brackets
      expect(parseReviewerInfo('@email@gmail.com Xiao Ming,reviewer,team')).toBeNull();
      // Invalid reviewer type
      expect(parseReviewerInfo('@email@gmail.com(Xiao Ming),review,team')).toBeNull();
      // No team
      expect(parseReviewerInfo('@email@gmail.com(Xiao Ming),reviewer')).toBeNull();
      // Empty team
      expect(parseReviewerInfo('@email@gmail.com(Xiao Ming),reviewer,')).toBeNull();
    });

  });
});
