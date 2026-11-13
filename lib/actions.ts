"use server";

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Anthropic } from "@anthropic-ai/sdk";
import { Prisma } from "@prisma/client";
import { createBookReportSchema } from "./zod/books/create-book-report-schema";
import { generateNovitaImage } from "@/lib/novita";
import { createCommand, lambda } from "./aws/lambda";
import { requireUser } from "./auth-guard";

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function getLessonById(id: string) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        quiz: true,
        exercise: true,
        Lecture: true,
      },
    });
    return lesson;
  } catch (error) {
    console.error("Failed to fetch lesson:", error);
    return null;
  }
}

export async function getAllLessons() {
  try {
    const lessons = await prisma.lesson.findMany();
    return lessons;
  } catch (error) {
    console.error("Failed to fetch lessons:", error);
    return null;
  }
}

export async function getUserbyUserId(userId: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });
    return user;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return null;
  }
}

export const recordJournal = async (formData: FormData) => {
  try {
    const name = formData.get("name");
    const phoneNumber = formData.get("phoneNumber");
    const userId = formData.get("userId");
    const journalId = formData.get("journalId") || null;

    console.log(journalId);

    const data = {
      name,
      phoneNumber,
      userId,
      journalId,
    };

    const response = await fetch("https://spoonacademy.com/api/journal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Failed to record journal:", error);
  }

  redirect("/dashboard");
};

export const recordConversation = async (formData: FormData) => {
  try {
    const name = formData.get("name");
    const phoneNumber = formData.get("phoneNumber");
    const userId = formData.get("userId");
    const journalId = formData.get("journalId") || null;

    console.log(journalId);

    const data = {
      name,
      phoneNumber,
      userId,
      journalId,
    };

    const response = await fetch(
      "https://spoonacademy.com/api/conversation/call-user",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Failed to record conversation:", error);
  }

  redirect("/dashboard");
};

export const getJournalByUserId = async (userId: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      include: { Journal: true },
    });

    if (!user) {
      console.error("User not found");
      return null;
    }

    return user;
  } catch (error) {
    console.error("Journals not found");
  }
};

export const deleteJournalById = async (id: string) => {
  try {
    await prisma.journal.delete({
      where: { id: id },
    });
  } catch (error) {
    console.error("Failed to delete journal:", error);
  }
  revalidatePath("/journals/history");
};

// lib/actions.js
export async function saveStory(formData: any) {
  try {
    console.log("Saving story with audio URL:", formData.audioUrl);

    const story = await prisma.story.create({
      data: {
        title: formData.title || "",
        topic: formData.topic,
        difficulty: formData.difficulty,
        paragraphs: parseInt(formData.paragraphs),
        genre: formData.genre,
        grammar: formData.grammar,
        frenchText: formData.frenchText,
        englishText: formData.englishText,
        vocabulary: formData.vocabulary,
        grammarHighlights: formData.grammarHighlights,
        audioUrl: formData.audioUrl,
        imageUrl: formData.imageUrl,
        exercises: formData.exercises,
      },
    });

    console.log("Story saved successfully:", story.id);
    return { success: true, id: story.id };
  } catch (error) {
    console.error("Failed to save story:", error);
    return { success: false, error: error.message };
  }
}

export async function generateStory(formData: FormData) {
  try {
    const topic = formData.get("topic");
    const difficulty = formData.get("difficulty");
    const paragraphs = formData.get("paragraphs");
    const genre = formData.get("genre");
    const grammar = formData.get("grammar");
    const learningObjectives = formData.get("learningObjectives");

    // Validation
    if (
      !topic ||
      !difficulty ||
      !paragraphs ||
      !genre ||
      !grammar ||
      !learningObjectives
    ) {
      return { success: false, error: "Missing required fields" };
    }

    const prompt = `Generate a ${genre} story in French with exactly ${paragraphs} paragraphs for ${difficulty} level students about ${topic}. And create a title for it in French.

    Story Requirements:
    - Use primarily ${grammar} tense/mood throughout the story
    - Maintain the ${genre} genre conventions and style
    - Include natural examples of ${grammar} usage
    - Ensure the story is appropriate for ${difficulty} level students
    - Ensure ${learningObjectives} are appiled to story
    - Include 5-15 relevant vocabulary words, prioritizing words related to the ${topic} and ${genre}
    - Include 5-15 relevant grammar highlights, prioritizing words related to the ${topic} and ${genre}
    - Create a title for the story
    
    Respond with ONLY a JSON object in the following format, no additional text:
    {
      "title":"Your title here",
      "frenchText": "Your French story here",
      "englishText": "Your English translation here",
      "vocabulary": [
        {"french": "word1", "english": "translation1", "grammarType": "verb/noun/adjective"},
        {"french": "word2", "english": "translation2", "grammarType": "verb/noun/adjective"},
        {"french": "word3", "english": "translation3", "grammarType": "verb/noun/adjective"}
      ],
      "grammarHighlights": [
        {"expression": "French expression", "explanation": "How it demonstrates ${grammar}"},
        {"expression": "French expression", "explanation": "How it demonstrates ${grammar}"}
      ]
    }`;

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const firstBlock = response.content[0];

    if (firstBlock.type !== "text") {
      throw new Error("Expected a text response from Claude");
    }

    const storyData = JSON.parse(firstBlock.text.trim());
    console.log(storyData);
    return { success: true, data: storyData };
  } catch (error) {
    console.error("Story generation error:", error);
    return { success: false, error: error.message };
  }
}

export async function getStoryById(id: string) {
  const story = await prisma.story.findUnique({
    where: { id },
    include: {
      StoryQuestions: true,
    },
  });

  if (!story) notFound();
  return story;
}

export async function getAllShortStories() {
  try {
    const stories = await prisma.story.findMany({
      include: {
        StoryQuestions: true,
      },
    });
    return stories;
  } catch (error) {
    console.error("Story generation error:", error);
    return null;
  }
}

export async function recordStoryQuestions(formData: FormData) {
  try {
    // Extract values from formData
    const name = formData.get("name");
    const userId = formData.get("userId");
    const storyId = formData.get("storyId");
    const englishText = formData.get("englishText");
    const phoneNumber = formData.get("phoneNumber");

    // Construct the data object
    const data = {
      name,
      userId,
      storyId,
      englishText,
      phoneNumber,
    };

    // Make the API request
    const response = await fetch(
      "https://spoonacademy.com/api/short-story-questions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    // Check for errors in the response
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    // Parse and return the response data
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to record story questions:", error.message);
    return null; // Return null on failure
  }
}

// adjust path to match your file location

export async function createBookReport(formData: FormData) {
  try {
    const raw = Object.fromEntries(formData.entries());
    const parsed = createBookReportSchema.parse(raw);

    const user = await prisma.user.findFirst({
      where: { id: parsed.userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const book = await prisma.book.create({
      data: {
        title: parsed.title,
        author: parsed.author,
        genre: parsed.genre,
        language: parsed.language,
        pages: parsed.pages,
        description: parsed.description,
        coverUrl: parsed.coverUrl,
        user: { connect: { id: user.id } },
      },
    });

    const bookReport = await prisma.bookReport.create({
      data: {
        user: { connect: { id: user.id } },
        book: { connect: { id: book.id } },
        status: "NOT_STARTED",
        progress: 0,
        startDate: new Date(),
      },
    });

    return { success: true, bookReport };
  } catch (error) {
    console.error("Error creating book report:", error.message);
    throw new Error("Failed to create book report");
  }
}

export async function addReadingLog(data: any) {
  try {
    console.log("readingLog data:", data);
    const bookId = data.bookId;
    const startPage = parseInt(data.startPage);
    const endPage = parseInt(data.endPage);
    const shortSummary = data.summary;

    // Validate input
    if (!bookId) throw new Error("Book ID is required");
    if (isNaN(startPage) || isNaN(endPage))
      throw new Error("Invalid page numbers");
    if (startPage >= endPage)
      throw new Error("End page must be greater than start page");

    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) throw new Error("Book not found");
    if (endPage > book.pages)
      throw new Error("End page cannot exceed total pages");

    // Create reading log
    const readingLog = await prisma.readingLog.create({
      data: {
        book: { connect: { id: bookId } },
        startPage,
        endPage,
        pagesRead: endPage - startPage,
        shortSummary,
      },
    });

    // Calculate reading progress percentage
    const readingProgress = Math.min(
      100,
      Math.floor((endPage / book.pages) * 100),
    );

    // Determine if the book is completed
    const isCompleted = readingProgress >= 100;

    // Update book
    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      data: {
        isReading: !isCompleted, // false if book is completed
        currentPage: endPage,
        readingProgress,
        isCompleted, // Set isCompleted based on reading progress
      },
    });

    revalidatePath(`/books/${bookId}`);
    return {
      success: true,
      readingLog,
      book: updatedBook,
    };
  } catch (error) {
    console.error("Error adding reading log:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Export the type so you can reuse it
export type BookWithReadingLogs = Prisma.BookGetPayload<{
  include: { readingLogs: true };
}>;

export async function getBooksByUserId(
  userId: string | null,
): Promise<BookWithReadingLogs[]> {
  // Guard clause so we don't crash if userId is null (from Clerk)
  if (!userId) return [];

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) return [];

    const books = await prisma.book.findMany({
      where: { user: { id: user.id } },
      include: {
        readingLogs: true,
      },
    });
    return books;
  } catch (error) {
    console.error("Error fetching books:", error);
    throw new Error("Failed to fetch books");
  }
}

export async function getBookReportById(bookReportId: string) {
  try {
    // console.log("Book Report ID:", bookReportId);
    const bookReport = await prisma.bookReport.findUnique({
      where: { id: bookReportId },
      include: {
        book: true,
        user: true,
      },
    });
    return bookReport;
  } catch (error) {
    console.error("Error fetching book report:", error.message);
    throw new Error("Failed to fetch book report");
  }
}

export async function getReadingLogsByBookReportId(bookReportId: string) {
  try {
    const readingLogs = await prisma.readingLog.findMany({
      where: { book: { id: bookReportId } },
    });
    return readingLogs;
  } catch (error) {
    console.error("Error fetching reading logs:", error.message);
    throw new Error("Failed to fetch reading logs");
  }
}

export async function editReadingLog(formData: FormData) {
  try {
    const shortSummary = formData.get("shortSummary");
    const readingLogId = formData.get("readingLogId");

    if (typeof shortSummary !== "string" || typeof readingLogId !== "string" || !shortSummary || !readingLogId) {
      throw new Error("Invalid data");
    }

    const log = await prisma.readingLog.update({
      where: { id: readingLogId },
      data: { shortSummary },
      select: { bookId: true },
    });

    revalidatePath(`/books/${log.bookId}`);
    return { success: true };
  } catch (error) {
    console.error("Error editing reading log:", error instanceof Error ? error.message : error);
    throw new Error("Failed to edit reading log");
  }
}

export async function deleteReadingLog(readingLogId: string) {
  try {
    // First get the reading log with its book details before deleting
    const readingLog = await prisma.readingLog.findUnique({
      where: { id: readingLogId },
      include: {
        book: {
          // Changed Book to book to match Prisma schema convention
          include: {
            readingLogs: true,
          },
        },
      },
    });

    if (!readingLog) {
      throw new Error("Reading log not found");
    }

    // Store book reference before deleting the log
    const book = readingLog.book;

    if (!book) {
      throw new Error("Associated book not found");
    }

    // Delete the reading log
    await prisma.readingLog.delete({
      where: { id: readingLogId },
    });

    // Get remaining logs for this book
    const remainingLogs = book.readingLogs.filter(
      (log) => log.id !== readingLogId,
    );

    // Find the last page read from remaining logs
    const lastPageRead =
      remainingLogs.length > 0
        ? Math.max(...remainingLogs.map((log) => log.endPage))
        : 0;

    // Calculate new reading progress
    const newProgress =
      book.pages > 0
        ? Math.min(100, Math.floor((lastPageRead / book.pages) * 100))
        : 0;

    // Update book progress
    await prisma.book.update({
      where: { id: book.id },
      data: {
        currentPage: lastPageRead,
        readingProgress: newProgress,
        isReading: newProgress < 100 && newProgress > 0,
      },
    });

    revalidatePath(`/books/${book.id}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting reading log:", error);
    return {
      success: false,
      error: error.message || "Failed to delete reading log",
    };
  }
}

const LANGUAGE_ENUM_MAP = {
  en: "ENGLISH",
  fr: "FRENCH",
  es: "SPANISH",
  english: "ENGLISH",
  french: "FRENCH",
  spanish: "SPANISH",
};

const LEVEL_ENUM_MAP = {
  beginner: "BEGINNER",
  intermediate: "INTERMEDIATE",
  advanced: "ADVANCED",
};

export async function saveConversationDialogue(data: any) {
  try {
    const {
      userId,
      introduction,
      vocabulary,
      characters,
      dialogue,
      title,
      imageUrl = null,
      metadata = {},
      aiAvatarUrl = null,
      maleAiAvatarUrl = null,
      femaleAiAvatarUrl = null,
      level,
    } = data;

    // 1. Find user (or connect directly if userId is @unique in Prisma)
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // 2. Safe Enum mapping (case-insensitive)
    const nativeKey = metadata?.languages?.native?.toLowerCase();
    const targetKey = metadata?.languages?.target?.toLowerCase();
    const levelKey = level?.toLowerCase();

    const nativeLanguage = LANGUAGE_ENUM_MAP[nativeKey] || null;
    const tutorLanguage = LANGUAGE_ENUM_MAP[targetKey] || null;
    const levelEnum = LEVEL_ENUM_MAP[levelKey] || null;

    // 3. Create the record in Prisma
    const savedConversation = await prisma.conversation.create({
      data: {
        user: { connect: { id: user.id } },
        title,
        metadata,
        nativeLanguage,
        tutorLanguage,
        introduction,
        vocabulary,
        characters,
        dialogue,
        imageUrl,
        aiAvatarUrl,
        aiAvatarMaleUrl: maleAiAvatarUrl,     // Prisma column name
        aiAvatarFemaleUrl: femaleAiAvatarUrl, // Prisma column name
        level: levelEnum,
      },
    });

    // Revalidate only on success
    revalidatePath("/conversations");

    return { success: true, conversationId: savedConversation.id};
  } catch (error) {
    console.error("Error saving conversation dialogue:", error);
    throw new Error(error.message || "Failed to save conversation dialogue");
  }
}


export async function getAllConversations() {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        user: true,
      },
    });
    return conversations;
  } catch (error) {
    console.error("Error fetching conversations:", error.message);
    throw new Error("Failed to fetch conversations");
  }
}

export async function getConversationById(conversationId: string) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user: true,
      },
    });
    return conversation;
  } catch (error) {
    console.error("Error fetching conversation:", error.message);
    throw new Error("Failed to fetch conversation");
  }
}

export async function getConversationAnalysisByUserId(userId: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }
    const conversationRecords = await prisma.conversationRecord.findMany({
      where: { user: { id: user.id } },
    });
    return conversationRecords;
  } catch (error) {}
}



export async function getAccountSettingsByUserId(userId:string) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if(!user) {
      throw new Error("User not found");
    }
    const accountSettings = await prisma.accountSettings.findUnique({
      where: { userId: user.id },
    });

    if (!accountSettings) {
      throw new Error("Account settings not found");
    }
    return accountSettings;
  } catch (error) {
    console.error("Error fetching account settings:", error.message);
    throw new Error("Failed to fetch account settings");
  }
}

export async function getUserDetailsById(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        image: true,
        avatarUrl: true,
        displayUsername: true,
        username: true,
        firstName: true,
        lastName: true,
        gender: true,
        phone: true,
        role: true,
        nativeLanguage: true,
        targetLanguage: true,
        AccountSettings: true,
        BillingInformation: true,
        spriteProfile: {
          include: {
            sprite: true,
          },
        }, // ✅ Fixed missing closing brace here
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching user details:", message);
    throw new Error("Failed to fetch user details");
  }
}

export type UserDetails = Awaited<ReturnType<typeof getUserDetailsById>>;

/**
 * Unified Server Action to update User, AccountSettings, and SpriteProfile
 */
export async function updateAccountSettings(
  userId: string,
  data: {
    // User fields
    displayUsername?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    nativeLanguage?: string;
    targetLanguage?: string;
    gender?: string;
    image?: string | null;
    avatarUrl?: string | null;
    // SpriteProfile fields
    spriteSlug?: string; // "vox" | "vivi"
    targetVoiceId?: string;
    nativeVoiceId?: string;
    // AccountSettings fields (Notifications & Sharing)
    dailyEmails?: boolean;
    weeklyEmails?: boolean;
    promotionEmails?: boolean;
    shareReadingLogs?: boolean;
    shareConversationActivity?: boolean;
    shareAchievements?: boolean;
    shareLessonsAndCourses?: boolean;
  },
) {
  try {
    // 1. Update core User fields if provided
    const userUpdateData: Record<string, unknown> = {};
    if (data.displayUsername !== undefined)
      userUpdateData.displayUsername = data.displayUsername;
    if (data.username !== undefined) userUpdateData.username = data.username;
    if (data.firstName !== undefined) userUpdateData.firstName = data.firstName;
    if (data.lastName !== undefined) userUpdateData.lastName = data.lastName;
    if (data.phone !== undefined) userUpdateData.phone = data.phone;
    if (data.nativeLanguage !== undefined)
      userUpdateData.nativeLanguage = data.nativeLanguage;
    if (data.targetLanguage !== undefined)
      userUpdateData.targetLanguage = data.targetLanguage;
    if (data.gender !== undefined) userUpdateData.gender = data.gender;

    // Sync BOTH image and avatarUrl so whichever getter is used always reflects the new avatar!
    const nextAvatar =
      data.avatarUrl !== undefined ? data.avatarUrl : data.image;
    if (nextAvatar !== undefined) {
      userUpdateData.image = nextAvatar;
      userUpdateData.avatarUrl = nextAvatar;
    }

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    // 2. Update SpriteProfile if sprite, voice, or language changed
    if (
      data.spriteSlug ||
      data.targetVoiceId ||
      data.nativeVoiceId ||
      data.targetLanguage ||
      data.nativeLanguage
    ) {
      const sprite = data.spriteSlug
        ? await prisma.sprite.findUnique({ where: { slug: data.spriteSlug } })
        : null;

      await prisma.spriteProfile.updateMany({
        where: { userId },
        data: {
          ...(sprite ? { spriteId: sprite.id } : {}),
          ...(data.targetVoiceId ? { targetVoiceId: data.targetVoiceId } : {}),
          ...(data.nativeVoiceId ? { nativeVoiceId: data.nativeVoiceId } : {}),
          ...(data.targetLanguage
            ? { targetLanguage: data.targetLanguage }
            : {}),
          ...(data.nativeLanguage
            ? { nativeLanguage: data.nativeLanguage }
            : {}),
        },
      });
    }

    // 3. Upsert AccountSettings (Sharing & Notifications)
    const settingsFields = [
      "dailyEmails",
      "weeklyEmails",
      "promotionEmails",
      "shareReadingLogs",
      "shareConversationActivity",
      "shareAchievements",
      "shareLessonsAndCourses",
    ] as const;

    const settingsUpdate: Record<string, boolean> = {};
    for (const key of settingsFields) {
      if (data[key] !== undefined) {
        settingsUpdate[key] = data[key]!;
      }
    }

    if (Object.keys(settingsUpdate).length > 0) {
      await prisma.accountSettings.upsert({
        where: { userId },
        update: settingsUpdate,
        create: {
          userId,
          ...settingsUpdate,
        },
      });
    }

    revalidatePath("/account");
    revalidatePath("/dashboard");
    revalidatePath("/learning-hub");
    revalidatePath("/conversation");
    return { success: true };
  } catch (error) {
    console.error("Failed to update account settings:", error);
    throw new Error("Failed to update settings");
  }
}


export async function getSharedActivity() {
  try {
    // Get users who have enabled sharing
    const sharedUsers = await prisma.accountSettings.findMany({
      where: {
        OR: [{ shareReadingLogs: true }, { shareConversationActivity: true }],
      },
      select: {
        userId: true,
        shareReadingLogs: true,
        shareConversationActivity: true,
      },
    });

    // Separate user IDs based on what they're sharing
    const readingLogUserIds = sharedUsers
      .filter((user) => user.shareReadingLogs)
      .map((user) => user.userId);

    const conversationUserIds = sharedUsers
      .filter((user) => user.shareConversationActivity)
      .map((user) => user.userId);

    // Parallel fetch for better performance
    const [readingLogs, conversations] = await Promise.all([
      // Only fetch reading logs if there are users sharing them
      readingLogUserIds.length > 0
        ? prisma.readingLog.findMany({
            where: {
              book: {
                userId: { in: readingLogUserIds },
              },
            },
            include: {
              book: {
                select: { userId: true },
              },
            },
          })
        : [],

      // Only fetch conversations if there are users sharing them
      conversationUserIds.length > 0
        ? prisma.conversationRecord.findMany({
            where: {
              userId: { in: conversationUserIds },
            },
            include: {
              user: {
                select: {
                 image: true,
                 avatarUrl: true,
                },
              },
            },
          })
        : [],
    ]);

    return {
      readingLogs,
      conversations,
    };
  } catch (error) {
    // Log the error for debugging
    console.error("Error fetching shared activity:", error);

    // Rethrow as a more specific error
    throw new Error("Failed to fetch shared activity data");
  }
}

export async function getAllAchievements() {
  try {
    const achievements = await prisma.achievement.findMany({
      include: {
        category: true,
        UserProgress: true,
      },
    });
    return achievements;
  } catch (error) {
    console.error("Error fetching achievements:", error.message);
    throw new Error("Failed to fetch achievements");
  }
}
export async function getAchievementsByUserId(userId: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }
    const userAchievements = await prisma.userProgress.findMany({
      where: { userId: user.id },
      include: {
        achievement: {
          include: {
            category: true,
          },
        },
      },
    });
    return userAchievements;
  } catch (error) {
    console.error("Error fetching achievements by user ID:", error.message);
    throw new Error("Failed to fetch achievements by user ID");
  }
}

export async function getUserDataByUserId(userId: string) {
  try {
    const userData = await prisma.user.findFirst({
      where: { id: userId },
      include: {
        Book: true,
        UserProgress: {
          include: {
            achievement: true,
          },
        },
        Progress: {
          include: {
            lesson: {
              select: {
                title: true,
                type: true,
                id: true,
                course: { select: { title: true, id: true } },
              },
            },
          },
        },
        notifications: {
          select: {
            isRead: true,
          },
        },
      },
    });

    if (!userData) {
      throw new Error("User not found");
    }

    return userData;
  } catch (error) {
    console.error("Error fetching user data by user ID:", error.message);
    throw new Error("Failed to fetch user data by user ID");
  }
}

export async function getReadingLogsByBookId(bookId: string) {
  try {
    const book = await prisma.book.findFirst({
      where: { id: bookId },
      select: {
        title: true,
        author: true,
        pages: true,
        id: true,
        readingLogs: true,
        BookReport: true,
      },
    });

    if (!book) {
      throw new Error("Book not found");
    }

    return {
      readingLogs: book.readingLogs,
      totalPages: book.pages,
      title: book.title,
      author: book.author,
      id: book.id,
      bookReports: book.BookReport,
    };
  } catch (error) {
    console.error("Error fetching reading logs by book ID:", error.message);
    throw new Error("Failed to fetch reading logs by book ID");
  }
}

export async function updateAllBooksProgress() {
  try {
    // Fetch all books with their pages and last reading log
    const books = await prisma.book.findMany({
      select: {
        id: true,
        pages: true,
        readingLogs: {
          orderBy: { endPage: "desc" },
          take: 1,
          select: { endPage: true },
        },
      },
    });

    const updates = books.map(async (book) => {
      if (book.pages === 0) return; // Avoid division by zero

      const lastEndPage = book.readingLogs[0]?.endPage || 0;
      const readingProgress = Math.round((lastEndPage / book.pages) * 100);

      return prisma.book.update({
        where: { id: book.id },
        data: {
          currentPage: lastEndPage,
          readingProgress,
        },
      });
    });

    // Run all updates in parallel
    await Promise.all(updates);

    console.log("Updated reading progress for all books.");
  } catch (error) {
    console.error(
      "Failed to update reading progress for all books:",
      error.message,
    );
    throw new Error("Error updating reading progress");
  }
}

export async function getCourseByEnrolledUsers(userId:string) {
  console.log("User ID:", userId);
  try {
    // Assuming the userId is directly passed to the function, no need to fetch the user first
    const enrolledCourse = await prisma.course.findFirst({
      where: {
        enrollments: {
          some: { userId: userId }, // Filter where any enrollment has this userId
        },
      },
      include: {
        enrollments: true,
        lessons: true, // Optional: include if you need lesson data
        teacher: true, // Optional: include if you need teacher data
      },
    });

    return enrolledCourse;
  } catch (error) {
    console.error("Error fetching enrolled course by user ID:", error.message);
    throw new Error("Failed to fetch enrolled course by user ID");
  }
}

export async function getAllCourses() {
  try {
    const courses = await prisma.course.findMany({
      include: {
        enrollments: true,
        lessons: true, // Optional: include if you need lesson data
        teacher: true, // Optional: include if you need teacher data
      },
    });

    return courses;
  } catch (error) {
    console.error("Error fetching all courses:", error.message);
    throw new Error("Failed to fetch all courses");
  }
}

export async function getCourseById(courseId: string) {
  try {
    const course = await prisma.course.findFirst({
      where: { id: courseId },
      include: {
        enrollments: true,
        lessons: true, // Optional: include if you need lesson data
        teacher: true,
        // Optional: include if you need teacher data
      },
    });

    if (!course) {
      throw new Error("Course not found");
    }

    return course;
  } catch (error) {
    console.error("Error fetching course by ID:", error.message);
    throw new Error("Failed to fetch course by ID");
  }
}

export async function getIdByUserId(userId: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user.id;
  } catch (error) {
    console.error("Error fetching ID by user ID:", error.message);
    throw new Error("Failed to fetch ID by user ID");
  }
}

export async function getCourseByEnrolledUser(
  userId: string,
  courseId: string,
) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const enrolledCourse = await prisma.course.findFirst({
      where: {
        id: courseId,
        enrollments: {
          some: { userId: user.id },
        },
      },
      include: {
        enrollments: true,
        lessons: {
          select: {
            title: true,
            type: true,
            topics: true,
            id: true,
            description: true,
            level: true,
            quiz: true,
            teacher: true,
            Progress: true,
          },
        },
        // Optional: Include teacher if needed
      },
    });

    if (!enrolledCourse) {
      throw new Error("Course not found for this user.");
    }
    return enrolledCourse;
  } catch (error) {
    console.error("Error fetching enrolled course:", error.message);
    throw new Error("Failed to fetch enrolled course");
  }
}

export async function getReadNotificationsByUserId(userId: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Fetch only unread notifications
    const unreadNotifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        isRead: false, // Filter for unread notifications
      },
    });

    return unreadNotifications.length; // Return the count of unread notifications
  } catch (error) {
    console.error(
      "Error fetching unread notifications by user ID:",
      error.message,
    );
    throw new Error("Failed to fetch unread notifications by user ID");
  }
}

export async function updateLessonAndCourseProgress({
  userId,
  lessonId,
  courseId,
  score = null,
  status = "COMPLETED",
}) {
  try {
    // Start a transaction to ensure data consistency
    return await prisma.$transaction(async (tx) => {
      // 1. Get or create enrollment
      let enrollment = await tx.enrollment.findFirst({
        where: {
          userId,
          courseId,
        },
      });

      if (!enrollment) {
        enrollment = await tx.enrollment.create({
          data: {
            userId,
            courseId,
            status: "IN_PROGRESS",
            progress: 0,
          },
        });
      }

      // // 2. Update lesson progress
      // await tx.progress.upsert({
      //   where: {
      //     user: { userId },
      //     lesson: { id: lessonId },
      //   },
      //   update: {
      //     status: "COMPLETED",
      //     score,
      //     completedAt: new Date(),
      //     enrollmentId: enrollment.id, // Make sure this is set
      //   },
      //   create: {
      //     userId,
      //     lessonId,
      //     enrollmentId: enrollment.id,
      //     status: "COMPLETED",
      //     score,
      //     completedAt: new Date(),
      //   },
      // });

      // 3. Calculate new progress percentage
      const totalLessons = await tx.lesson.count({
        where: { courseId },
      });

      const completedLessons = await tx.progress.count({
        where: {
          userId,
          enrollment: {
            courseId,
          },
          status: "COMPLETED",
        },
      });

      const overallProgress = Math.round(
        (completedLessons / totalLessons) * 100,
      );

      // 4. Update enrollment with new progress
      const updatedEnrollment = await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          progress: overallProgress,
          status: overallProgress === 100 ? "COMPLETED" : "IN_PROGRESS",
          lastAccessedAt: new Date(),
        },
      });

      return {
        success: true,
        enrollment: updatedEnrollment,
        progress: overallProgress,
      };
    });
  } catch (error) {
    console.error("Error updating progress:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getExercisesByEnrolledUser(
  userId: string,
  exerciseId: string,
) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("User not found");
    }
    const enrolledExercises = await prisma.enrollment.findFirst({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            lessons: {
              include: {
                exercise: {
                  where: { id: exerciseId },
                },
              },
            },
          },
        },
      },
    });
    return enrolledExercises;
  } catch (error) {
    console.error("Error fetching exercises by user ID:", error.message);
    throw new Error("Failed to fetch exercises by user ID");
  }
}

export async function getEnrolledCourseExercises(userId: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      include: {
        Enrollment: true,
        Course: true,
      },
    });
    if (!user) {
      throw new Error("User not found");
    }
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            lessons: {
              include: {
                exercise: true,
              },
            },
          },
        },
      },
    });

    // Structure: Course → Lessons → Exercises
    return enrollments.flatMap((enrollment) =>
      enrollment.course.lessons.map((lesson) => ({
        lessonId: lesson.id,
        exercises: lesson.exercise,
      })),
    );
  } catch (error) {
    console.error("Error fetching exercises:", error.message);
    throw new Error("Failed to fetch course exercises");
  }
}

export async function getLessonExercisesByEnrolledUser(
  userId: string,
  lessonId: string,
  courseId: string,
) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }
    // Step 1: Check if the user is enrolled in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId },
      },
    });

    if (!enrollment) {
      throw new Error("User is not enrolled in this course.");
    }

    // Step 2: Fetch the lesson with its exercises, ensuring it belongs to the course
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        courseId: courseId,
      },
      include: {
        exercise: true, // Include the exercises
      },
    });

    if (!lesson) {
      throw new Error("Lesson not found.");
    }

    return lesson;
  } catch (error) {
    console.error(
      "Error fetching exercises by user ID and lesson ID:",
      error.message,
    );
    throw new Error("Failed to fetch exercises by user ID and lesson ID");
  }
}

export async function getAllCoursesByUserId(userId: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { teacherId: user.id },
          { enrollments: { some: { userId: user.id } } },
        ],
      },
      include: {
        enrollments: true,
        lessons: true, // Optional: include if you need lesson data
        teacher: true, // Optional: include if you need teacher data
      },
      orderBy: { createdAt: "desc" },
    });

    return courses;
  } catch (error) {
    console.error("Error fetching all courses by user ID:", error.message);
    throw new Error("Failed to fetch all courses by user ID");
  }
}

export async function getUserAvatarImage(userId: string) {
  try {
    console.log("user id:", userId);
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: {
        image:true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user.avatarUrl ? user.avatarUrl : user.image;
  } catch (error) {
    console.error("Error fetching user avatar image:", error.message);
    throw new Error("Failed to fetch user avatar image");
  }
}

export async function getAllGames() {
  try {
    const games = await prisma.game.findMany({
      include: {
        scores: {
          orderBy: { score: "desc" }, // Sort scores in descending order
          take: 1, // Only get the highest score per game
          select: {
            score: true,
            user: {
              select: {
                name: true,
                image: true,
                avatarUrl: true,
              },
            },
          },
        },
        variations: true
      },
    });

    return games;
  } catch (error) {
    console.error("Error fetching all games:", error.message);
    throw new Error("Failed to fetch all games");
  }
}

export async function getGameById(gameId: string) {
  try {
    const gameData = await prisma.game.findFirst({
      where: { id: gameId },
      include: {
        scores: true,
        soundEffects: true,
      },
    });
    return gameData;
  } catch (error) {
    console.error("Error fetching game by ID:", error.message);
    throw new Error("Failed to fetch game by ID");
  }
}

export async function getGameForVariations(gameId: string) {
  try {
    const gameData = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        title: true,
        type: true,
        imageUrl: true,
        contexts: true, // Grab the contexts we just seeded!
      },
    });
    return gameData;
  } catch (error) {
    console.error("Error fetching game for variations:", error);
    throw new Error("Failed to fetch game");
  }
}

export async function getLimitedGameData() {
  try {
    const games = await prisma.game.findMany({
      select: {
        id: true,
        title: true,
        variations: true,
      },
    });
    return games;
  } catch (error) {
    console.error("Error fetching limited game data:", error.message);
    throw new Error("Failed to fetch limited game data");
  }
}

export async function isAdmin(userId: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: {
        role: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user?.role === "ADMIN";
  } catch (error) {
    console.error("Error checking admin status:", error.message);
    return false;
  }
}

export async function getUsersWithEmailShare() {
  try {
    const users = await prisma.user.findMany({
      where: {
        AccountSettings: {
          OR: [
            { weeklyEmails: true },
            { dailyEmails: true },
            { promotionEmails: true },
          ],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    return users;
  } catch (error) {
    console.error("Error fetching users with email share:", error.message);
    return [];
  }
}
export async function getEmailTemplates() {
  try {
    const emailTemplates = await prisma.emailTemplate.findMany();
    return emailTemplates;
  } catch (error) {
    console.error("Error fetching email templates:", error.message);
    return [];
  }
}

export async function getEmailSchedules() {
  try {
    const emailSchedules = await prisma.emailSchedule.findMany();
    return emailSchedules;
  } catch (error) {
    console.error("Error fetching email schedules:", error.message);
    return [];
  }
}

export async function patchGameCode(gameId: string, code: string) {
  try {
    await prisma.game.update({
      where: { id: gameId },
      data: { code },
    });

    const task = await prisma.systemTask.create({
      data: {
        type: "GAME_SCHEMA_GENERATION",
        status: "IN_PROGRESS",
        metadata: {
          gameId,
        },
      },
    });

    const url = process.env.NEXT_PUBLIC_URL;

    const payload = {
      taskId: task.id,
      code,
      webhookUrl: `${url}/api/webhooks/system-tasks/${task.id}`,
    };

    const command = createCommand({
      functionName: "spoon-game-schema-generator",
      payload,
      invocationType: "Event",
    });

    await lambda.send(command);

    // Refresh the admin page so the "Generate" button unlocks
    revalidatePath("/admin/games");

    return { success: true };
  } catch (error: any) {
    console.error("Error patching game code:", error.message);
    throw new Error("Failed to attach game code.");
  }
}

type GenerateThumbnailResult =
  | { success: true; imageUrl: string }
  | { success: false; error: string };

export async function generateGameThumbnail(
  prompt: string,
): Promise<GenerateThumbnailResult> {
  try {
    const isUser = await requireUser();
    const userId = isUser.id;
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Forbidden" };
    }

    if (!prompt || !prompt.trim()) {
      return { success: false, error: "Prompt is required" };
    }

    const imageUrl = await generateNovitaImage(
      `${prompt}, detailed, vibrant colors, high quality`,
    );

    return { success: true, imageUrl };
  } catch (error: any) {
    console.error("[generateGameThumbnail] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to generate image",
    };
  }
}

export async function getGameVariation(gameId: string, variationId: string) {
  const gameVariation = await prisma.gameVariation.findFirst({
    where: {
      id: variationId,
      gameId,
    },
    include: {
      game: true,
    },
  });
  return gameVariation;
}

interface SaveScoreParams {
  gameId: string;
  variationId?: string; // Optional if you want to track variation context later
  score: number | string;
}

export async function saveGameScore({
  gameId,
  score,
}: SaveScoreParams) {
  // 1. Ensure User is Authenticated
  const user = await requireUser()
  const userId = user?.id
  if (!userId) {
    throw new Error("Unauthorized: You must be logged in to save scores.");
  }

  // 2. Safely parse score to an Integer
  const numericScore = typeof score === "string" ? parseInt(score, 10) : score;

  if (isNaN(numericScore)) {
    throw new Error("Invalid score value.");
  }

  // 3. Look up existing score using Prisma's composite unique key (userId_gameId)
  const existingRecord = await prisma.gameScore.findUnique({
    where: {
      userId_gameId: {
        userId,
        gameId,
      },
    },
  });

  // 4. Create record if user has no score yet for this game
  if (!existingRecord) {
    const newRecord = await prisma.gameScore.create({
      data: {
        userId,
        gameId,
        score: numericScore,
      },
    });
    return { success: true, record: newRecord, isNewHighScore: true };
  }

  // 5. Update record ONLY if the new score is a HIGH SCORE
  if (numericScore > existingRecord.score) {
    const updatedRecord = await prisma.gameScore.update({
      where: {
        id: existingRecord.id,
      },
      data: {
        score: numericScore,
      },
    });
    return { success: true, record: updatedRecord, isNewHighScore: true };
  }

  // 6. Score was lower than existing high score
  return { 
    success: true, 
    record: existingRecord, 
    isNewHighScore: false,
    message: "Score submitted, but didn't beat previous high score." 
  };
}


export async function getAllUserReviews(userId: string) {
  const reviews = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      dailyJournals: {
        include: { review: true },
      },
      FreestyleSession: {
        include: { review: true },
      },
      // Change this part to include the parent conversation info:
      ConversationReview: {
        include: {
           conversation: {
             select: { title: true, nativeLanguage: true, tutorLanguage: true }
           }
        }
      } 
    },
  });
  return reviews;
}

export type UserReviews = Awaited<ReturnType<typeof getAllUserReviews>>;