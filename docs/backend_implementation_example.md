# Example Implementation

## Entities example

```typescript
// app/core/domain/post/entity.ts

import type { UserId } from "@/core/domain/user/valueObject";
import { PostId, PostContent } from "./valueObject";
import type { PostId as PostIdType, PostContent as PostContentType } from "./valueObject";

// Post型定義
type PostBase = Readonly<{
  id: PostIdType;
  userId: UserId;
  content: PostContentType;
  createdAt: Date;
  updatedAt: Date;
}>;

type DraftPost = PostBase & {
  readonly status: "draft";
};

type PublishedPost = PostBase & {
  readonly status: "published";
};

type Post = DraftPost | PublishedPost;

export type { Post, DraftPost, PublishedPost };

// Postモジュール（振る舞いをまとめる）
export const Post = {
  // ファクトリーメソッド
  create: (params: { userId: UserId; content: string }): DraftPost => {
    const now = new Date();
    return {
      id: PostId.generate(),
      userId: params.userId,
      content: PostContent.create(params.content),
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
  },

  // 振る舞い
  updateContent: (post: Post, newContent: string): Post => {
    return {
      ...post,
      content: PostContent.create(newContent),
      updatedAt: new Date(),
    };
  },

  // 振る舞い
  publish: (post: DraftPost): PublishedPost => {
    return {
      ...post,
      status: "published",
      updatedAt: new Date(),
    };
  },

  // 型ガード
  isDraft: (post: Post): post is DraftPost => post.status === "draft",
  isPublished: (post: Post): post is PublishedPost => post.status === "published",
};
```

## Value Objects example

```typescript
// app/core/domain/post/valueObject.ts

import { v7 as uuidv7 } from "uuid";
import { BusinessRuleError } from "@/core/domain/error";
import { PostErrorCode } from "./errorCode";

const POST_CONTENT_MAX_LENGTH = 5000;

// PostId
type PostId = string & { readonly brand: "PostId" };

export type { PostId };

export const PostId = {
  create: (id: string): PostId => {
    // Add validation if necessary
    return id as PostId;
  },
  generate: (): PostId => {
    return uuidv7() as PostId;
  },
};

// PostContent
type PostContent = string & { readonly brand: "PostContent" };

export type { PostContent };

export const PostContent = {
  create: (content: string): PostContent => {
    if (content.length === 0) {
      throw new BusinessRuleError(PostErrorCode.ContentEmpty, "Post content cannot be empty");
    }
    if (content.length > POST_CONTENT_MAX_LENGTH) {
      throw new BusinessRuleError(PostErrorCode.ContentTooLong, "Post content exceeds maximum length");
    }
    return content as PostContent;
  },
  maxLength: POST_CONTENT_MAX_LENGTH,
};

// PostStatus
type PostStatus = "draft" | "published";

export type { PostStatus };

export const PostStatus = {
  create: (status: string): PostStatus => {
    if (status !== "draft" && status !== "published") {
      throw new BusinessRuleError(PostErrorCode.InvalidStatus, "Invalid post status");
    }
    return status as PostStatus;
  },
  isDraft: (status: PostStatus): status is "draft" => status === "draft",
  isPublished: (status: PostStatus): status is "published" => status === "published",
};

// Other value objects...
```

## Ports example

```typescript
// app/core/domain/post/ports/postRepository.ts

import type { RepositoryError } from "@/core/error/adapter";
import type { Pagination, PaginationResult } from "@/core/domain/common/pagination";
import type { Post } from "@/core/domain/post/entity";
import type { UserId } from "@/core/domain/user/valueObject";

export interface PostRepository {
  save(post: Post): Promise<void>;
  findByUserId(userId: UserId, pagination: Pagination): Promise<PaginationResult<Post>>;
  // Other repository methods...
}
```

```typescript
// app/core/domain/file/ports/storageManager.ts

export interface StorageManager {
  uploadFile(/* Arguments */): Promise</* ReturnType */>;
  // Other storage management methods...
}
```

## Adapters example

```typescript
// app/core/adapters/drizzleSqlite/postRepository.ts

import type { InferSelectModel } from "drizzle-orm";
import type { Pagination, PaginationResult } from "@/lib/pagination";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import { BusinessRuleError } from "@/core/domain/error";
import type { UserId } from "@/core/domain/user/valueObject";
import type { Post } from "@/core/domain/post/entity";
import type { PostId, PostContent, PostStatus } from "@/core/domain/post/valueObject";
import type { PostRepository } from "@/core/domain/post/ports/postRepository";
import { posts } from "@/core/adapters/drizzleSqlite/schema";
import type { Executor } from "./database";

type PostDataModel = InferSelectModel<typeof posts>;

export class DrizzleSqlitePostRepository implements PostRepository {
  constructor(
    private readonly executor: Executor) {}

  into(data: PostDataModel): Post {
    return {
      id: data.id as PostId,
      userId: data.userId as UserId,
      content: data.content as PostContent,
      status: data.status as PostStatus,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async save(post: Post): Promise<void> {
    try {
      await this.executor
        .insert(posts)
        .values(post)
        .onConflictDoUpdate({
          target: posts.id,
          set: {
            userId: post.userId,
            content: post.content,
            status: post.status,
          },
        });
    } catch (error) {
      // Handle errors, possibly mapping database errors to specific errors or codes
      throw new SystemError(SystemErrorCode.DatabaseError, "Failed to save post", error);
    }
  }

  async findByUserId(userId: UserId, pagination: Pagination): Promise<PaginationResult<Post>> {
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    try {
      const [items, countResult] = await Promise.all([
        this.executor
          .select()
          .from(posts)
          .where(eq(posts.userId, userId))
          .limit(limit)
          .offset(offset),
        this.executor
          .select({ count: sql`count(*)` })
          .from(posts)
          .where(eq(posts.userId, userId)),
      ]);

      return {
        items: items.map((item) => this.into(item)),
        count: Number(countResult[0].count),
      };
    } catch (error) {
      // Handle errors, possibly mapping database errors to specific errors or codes
      throw new SystemError(SystemErrorCode.DatabaseError, "Failed to find posts", error);
    }
  }
}
```

## Database schema example

```typescript
// app/core/adapters/drizzleSqlite/schema.ts

import { v7 as uuidv7 } from "uuid";

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    // Other fields...
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date()),
  },
);
```

## Application Service DTO example

```typescript
// app/core/application/post/dto.ts

export type PostDetail = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: Date;
};
```

## Application Service example

```typescript
// app/core/application/container/post.ts

import type { PostRepository } from "@/core/domain/post/ports/postRepository";
import type { AuthProvider } from "@/core/domain/post/ports/authProvider";
import type { ServiceArgs } from "../types";

export type PostContainer = {
  postRepository: PostRepository;
  authProvider: AuthProvider;
};

export type PostServiceArgs<T = undefined> = ServiceArgs<PostContainer, T>;
```

```typescript
// app/core/application/post/createPost.ts

import { Post } from "@/core/domain/post/entity";
import type { DraftPost } from "@/core/domain/post/entity";
import type { PostServiceArgs } from "../container/post";
import {
  UnauthenticatedError,
  UnauthenticatedErrorCode,
} from "../error";

export type CreatePostInput = {
  // Primitive types for input DTOs
  content: string;
};

// Pass arguments as an object
export async function createPost({
  container,
  input,
}: PostServiceArgs<CreatePostInput>): Promise<DraftPost> {
  const userId = container.authProvider.getUserId();

  if (!userId) {
    throw new UnauthenticatedError(UnauthenticatedErrorCode.AuthenticationRequired, "Authentication required");
  }

  const post = Post.create({
    userId,
    content: input.content,
  });

  await container.postRepository.save(post);

  return post;
}
```

## DI Container example

```typescript
// DI Container for specific environment
// ex: app/core/application/container/cli.ts

import type { PostContainer } from "@/core/application/container/post";
import { getDatabase } from "@/core/adapters/drizzleSqlite/client";

export function createPostCliContainer(): PostContainer {
  const databaseUrl = process.env.SQLITE_URL;
  if (!databaseUrl) {
    throw new Error("SQLITE_URL is not set");
  }

  const db = getDatabase(databaseUrl);

  return {
    postRepository: new DrizzleSqlitePostRepository(db),
    authProvider: new BetterAuthAuthProvider(/* Config */),
  };
}
```

