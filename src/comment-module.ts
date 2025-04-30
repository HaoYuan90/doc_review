/**
 * @preserve
 * @OnlyCurrentDoc
 */

// Example: @pewpew@gmail.com(Xiao Ming),reviewer,xfn
const emailExp = '[a-z0-9+_.-]+@[a-z0-9.-]+\\.[a-z0-9]{2,}';
const nameExp = '[a-z]+(?:[\\s.]+[a-z]+)*';
const typeExp = 'reviewer|approver';
const teamExp = '[a-z0-9]+(?:[\\s.]+[a-z0-9]+)*';
const reviewCommentExp = new RegExp(`^@(${emailExp})\\s?\\(\\s?(${nameExp})\\s?\\)\\s?,\\s?(${typeExp})\\s?,\\s?(${teamExp})$`, 'i');

const resolveAction = 'resolve';

export enum ReviewerType {
  Reviewer,
  Approver,
}

export enum ReviewStatus {
  NotStarted,
  InProgress,
  Approved,
}

export interface ReviewerInfo {
  email: string;
  name: string;
  type: ReviewerType;
  team: string;
}

export interface ReviewerInfoStatus {
  info: ReviewerInfo;
  status: ReviewStatus
}

function parseReviewerInfo(text: string): ReviewerInfo | null {
  const match = text.match(reviewCommentExp);
  if (match) {
    const email = match[1];
    const name = match[2];
    const type = match[3].toLowerCase() === 'reviewer' ? ReviewerType.Reviewer : ReviewerType.Approver;
    const team = match[4];
    return { email, name, type, team };
  } else {
    return null;
  }
}

function getComments(pageToken: string | undefined) {
  return Drive.Comments.list(DocumentApp.getActiveDocument().getId(), {
    pageToken: pageToken,
    includeDeleted: true,
    fields:
      'nextPageToken, comments(deleted, resolved, content, author(displayName, emailAddress), replies(deleted, content, action, author(displayName)))',
  });
}

export function processAllComments(): ReviewerInfoStatus[] {
  let pageToken: string | undefined = undefined;

  const reviewerInfoByName = new Map<string, ReviewerInfo>();
  const reviewedByName = new Set<string>();
  const approvedByName = new Set<string>();

  do {
    const resp = getComments(pageToken);
    pageToken = resp.nextPageToken;
    if (!resp.comments) {
      continue;
    }
    const comments = resp.comments;
    for (const comment of comments) {
      if (comment.deleted) {
        continue;
      }
      if (comment.author && comment.author.displayName) {
        // People who left left comments in the doc have reviewed it
        reviewedByName.add(comment.author.displayName);
      }
      if (!comment.content) {
        continue;
      }
      const reviewerInfo = parseReviewerInfo(comment.content);
      if (!reviewerInfo) {
        continue;
      }
      if (reviewerInfoByName.has(reviewerInfo.name)) {
        console.warn('Duplicate comments getting review from (%s, %s)', reviewerInfo.email, reviewerInfo.name);
        continue;
      }
      reviewerInfoByName.set(reviewerInfo.name, reviewerInfo);

      if (!comment.resolved || !comment.replies) {
        // Resolved comment will definitely have at least one reply
        continue;
      }
      // Process resolved comment from replies
      for (const reply of comment.replies) {
        // TODO: Does not handle when comment is repeatedly resolved and unresolved
        if (reply.deleted || reply.action !== resolveAction) {
          continue;
        }
        if (reviewerInfo.name === reply.author?.displayName) {
          approvedByName.add(reviewerInfo.name);
        }
      }
    }
  } while (pageToken);

  // Process approval status
  const infoList = Array.from(reviewerInfoByName.values()).sort((a, b) => a.email.localeCompare(b.email));
  let infoStatusList: ReviewerInfoStatus[] = [];
  for (const info of infoList) {
    const status = approvedByName.has(info.name) ? ReviewStatus.Approved : (reviewedByName.has(info.name) ? ReviewStatus.InProgress : ReviewStatus.NotStarted);
    infoStatusList.push({ info, status });
  }
  return infoStatusList;
}

/**
 * Gets the text the user has selected. If there is no selection,
 * this function displays an error message.
 *
 * @return {Array.<string>} The selected text.
 */
function getSelectedText() {
  const selection = DocumentApp.getActiveDocument().getSelection();
  const text = [];
  if (selection) {
    const elements = selection.getSelectedElements();
    for (let i = 0; i < elements.length; ++i) {
      if (elements[i].isPartial()) {
        const element = elements[i].getElement().asText();
        const startIndex = elements[i].getStartOffset();
        const endIndex = elements[i].getEndOffsetInclusive();

        text.push(element.getText().substring(startIndex, endIndex + 1));
      } else {
        const element = elements[i].getElement().asText();
        // Only translate elements that can be edited as text; skip images and
        // other non-text elements.
        if (element.editAsText()) {
          const elementText = element.getText();
          // This check is necessary to exclude images, which return a blank
          // text element.
          if (elementText) {
            text.push(elementText);
          }
        }
      }
    }
  }
  if (!text.length) throw new Error('Please select some text.');
  return text;
}

/**
 * Gets the stored user preferences for the origin and destination languages,
 * if they exist.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @return {Object} The user's origin and destination language preferences, if
 *     they exist.
 */
function getPreferences() {
  const userProperties = PropertiesService.getUserProperties();
  return {
    originLang: userProperties.getProperty('originLang'),
    destLang: userProperties.getProperty('destLang'),
  };
}

/**
 * Gets the user-selected text and translates it from the origin language to the
 * destination language. The languages are notated by their two-letter short
 * form. For example, English is 'en', and Spanish is 'es'. The origin language
 * may be specified as an empty string to indicate that Google Translate should
 * auto-detect the language.
 *
 * @param {string} origin The two-letter short form for the origin language.
 * @param {string} dest The two-letter short form for the destination language.
 * @param {boolean} savePrefs Whether to save the origin and destination
 *     language preferences.
 * @return {Object} Object containing the original text and the result of the
 *     translation.
 */
function getTextAndTranslation(
  origin: string,
  dest: string,
  savePrefs: boolean
) {
  if (savePrefs) {
    PropertiesService.getUserProperties()
      .setProperty('originLang', origin)
      .setProperty('destLang', dest);
  }
  const text = getSelectedText().join('\n');
  return {
    text: text,
    translation: translateText(text, origin, dest),
  };
}

/**
 * Replaces the text of the current selection with the provided text, or
 * inserts text at the current cursor location. (There will always be either
 * a selection or a cursor.) If multiple elements are selected, only inserts the
 * translated text in the first element that can contain text and removes the
 * other elements.
 *
 * @param {string} newText The text with which to replace the current selection.
 */
function insertText(newText: string) {
  const selection = DocumentApp.getActiveDocument().getSelection();
  if (selection) {
    let replaced = false;
    const elements = selection.getSelectedElements();
    if (
      elements.length === 1 &&
      elements[0].getElement().getType() ===
      DocumentApp.ElementType.INLINE_IMAGE
    ) {
      throw new Error("Can't insert text into an image.");
    }
    for (let i = 0; i < elements.length; ++i) {
      if (elements[i].isPartial()) {
        const element = elements[i].getElement().asText();
        const startIndex = elements[i].getStartOffset();
        const endIndex = elements[i].getEndOffsetInclusive();
        element.deleteText(startIndex, endIndex);
        if (!replaced) {
          element.insertText(startIndex, newText);
          replaced = true;
        } else {
          // This block handles a selection that ends with a partial element. We
          // want to copy this partial text to the previous element so we don't
          // have a line-break before the last partial.
          const parent = element.getParent();
          const remainingText = element.getText().substring(endIndex + 1);
          parent.getPreviousSibling().asText().appendText(remainingText);
          // We cannot remove the last paragraph of a doc. If this is the case,
          // just remove the text within the last paragraph instead.
          if (parent.getNextSibling()) {
            parent.removeFromParent();
          } else {
            element.removeFromParent();
          }
        }
      } else {
        const element = elements[i].getElement().asText();
        if (!replaced && element.editAsText()) {
          // Only translate elements that can be edited as text, removing other
          // elements.
          element.setText(newText);
          replaced = true;
        } else {
          // We cannot remove the last paragraph of a doc. If this is the case,
          // just clear the element.
          if (element.getNextSibling()) {
            element.removeFromParent();
          } else {
            element.setText('');
          }
        }
      }
    }
  } else {
    const cursor = DocumentApp.getActiveDocument().getCursor();
    if (!cursor) {
      return;
    }
    const surroundingText = cursor.getSurroundingText().getText();
    const surroundingTextOffset = cursor.getSurroundingTextOffset();

    // If the cursor follows or preceds a non-space character, insert a space
    // between the character and the translation. Otherwise, just insert the
    // translation.
    if (surroundingTextOffset > 0) {
      if (surroundingText.charAt(surroundingTextOffset - 1) !== ' ') {
        newText = ' ' + newText;
      }
    }
    if (surroundingTextOffset < surroundingText.length) {
      if (surroundingText.charAt(surroundingTextOffset) !== ' ') {
        newText += ' ';
      }
    }
    cursor.insertText(newText);
  }
}

/**
 * Given text, translate it from the origin language to the destination
 * language. The languages are notated by their two-letter short form. For
 * example, English is 'en', and Spanish is 'es'. The origin language may be
 * specified as an empty string to indicate that Google Translate should
 * auto-detect the language.
 *
 * @param {string} text text to translate.
 * @param {string} origin The two-letter short form for the origin language.
 * @param {string} dest The two-letter short form for the destination language.
 * @return {string} The result of the translation, or the original text if
 *     origin and dest languages are the same.
 */
function translateText(text: string, origin: string, dest: string) {
  if (origin === dest) return text;
  return LanguageApp.translate(text, origin, dest);
}

export const internal = {
  parseReviewerInfo
}
