import express from "express";
import Study from "../models/Study.js";
import { upload } from "../middleware/UploadStudy.js";

const router = express.Router();

// Upload study image
router.post("/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  res.json({
    imageUrl: `/uploads/studies/${req.file.filename}`
  });
});


// Get all studies with filtering, pagination, and sorting
router.get("/", async (req, res) => {
  try {
    const {
      category,
      difficulty,
      search,
      featured,
      limit = 20,
      skip = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
      tags,
      timeFilter,
    } = req.query;

    let query = { status: "published" };

    // Category filter
    if (category && category !== "all") {
      query.category = category;
    }

    // Difficulty filter
    if (difficulty && difficulty !== "all") {
      query.difficulty = difficulty;
    }

    // Featured filter
    if (featured === "true") {
      query.isFeatured = true;
    }

    // Tags filter
    if (tags) {
      query.tags = { $in: tags.split(",") };
    }

    // Time filter
    if (timeFilter === "new") {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: oneWeekAgo };
    } else if (timeFilter === "popular") {
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: oneMonthAgo };
    }

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { callToAction: searchRegex },
        { "verses.reference": searchRegex },
        { "verses.text": searchRegex },
      ];
    }

    // Build query with sorting
    let studiesQuery = Study.find(query);

    // Sorting
    const sortField = {};
    if (sortBy === "popular") {
      sortField.views = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "likes") {
      sortField.likes = sortOrder === "asc" ? 1 : -1;
    } else {
      sortField[sortBy] = sortOrder === "asc" ? 1 : -1;
    }

    studiesQuery = studiesQuery
      .sort(sortField)
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const studies = await studiesQuery;
    const total = await Study.countDocuments(query);

    res.json({
      studies,
      total,
      hasMore: skip + studies.length < total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single study by ID with view increment
router.get("/:id", async (req, res) => {
  try {
    const study = await Study.findById(req.params.id);
    if (!study) return res.status(404).json({ message: "Study not found" });

    // Increment view count
    study.views += 1;
    await study.save();

    // Get related studies
    const relatedStudies = await Study.find({
      _id: { $ne: study._id },
      $or: [{ category: study.category }, { tags: { $in: study.tags } }],
      status: "published",
    })
      .limit(3)
      .sort({ views: -1 });

    res.json({
      study,
      relatedStudies,
      meta: {
        commentsCount: study.comments.length,
        totalLikes:
          study.likes.length +
          study.comments.reduce((sum, c) => sum + c.likes.length, 0),
        timeToComplete: study.timeToComplete,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get study statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const totalStudies = await Study.countDocuments({ status: "published" });
    const totalComments = await Study.aggregate([
      { $match: { status: "published" } },
      { $project: { commentsCount: { $size: "$comments" } } },
      { $group: { _id: null, total: { $sum: "$commentsCount" } } },
    ]);

    const totalLikes = await Study.aggregate([
      { $match: { status: "published" } },
      { $project: { likesCount: { $size: "$likes" } } },
      { $group: { _id: null, total: { $sum: "$likesCount" } } },
    ]);

    const categoryStats = await Study.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgViews: { $avg: "$views" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const topStudies = await Study.find({ status: "published" })
      .sort({ views: -1 })
      .limit(5)
      .select("title views likes comments");

    res.json({
      totalStudies,
      totalComments: totalComments[0]?.total || 0,
      totalLikes: totalLikes[0]?.total || 0,
      categoryStats,
      topStudies,
      featuredStudies: await Study.countDocuments({
        isFeatured: true,
        status: "published",
      }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get categories
router.get("/categories/all", async (req, res) => {
  try {
    const categories = [
      {
        value: "old_testament",
        label: "Old Testament",
        count: await Study.countDocuments({
          category: "old_testament",
          status: "published",
        }),
      },
      {
        value: "new_testament",
        label: "New Testament",
        count: await Study.countDocuments({
          category: "new_testament",
          status: "published",
        }),
      },
      {
        value: "gospels",
        label: "Gospels",
        count: await Study.countDocuments({
          category: "gospels",
          status: "published",
        }),
      },
      {
        value: "prophets",
        label: "Prophets",
        count: await Study.countDocuments({
          category: "prophets",
          status: "published",
        }),
      },
      {
        value: "wisdom",
        label: "Wisdom Books",
        count: await Study.countDocuments({
          category: "wisdom",
          status: "published",
        }),
      },
      {
        value: "epistles",
        label: "Epistles",
        count: await Study.countDocuments({
          category: "epistles",
          status: "published",
        }),
      },
      {
        value: "apocalyptic",
        label: "Apocalyptic",
        count: await Study.countDocuments({
          category: "apocalyptic",
          status: "published",
        }),
      },
      {
        value: "topical",
        label: "Topical",
        count: await Study.countDocuments({
          category: "topical",
          status: "published",
        }),
      },
    ];

    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get popular tags
router.get("/tags/popular", async (req, res) => {
  try {
    const tags = await Study.aggregate([
      { $match: { status: "published" } },
      { $unwind: "$tags" },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 },
          studies: { $push: "$title" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    res.json(
      tags.map((tag) => ({
        name: tag._id,
        count: tag.count,
        studies: tag.studies.slice(0, 3),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new study
router.post("/", async (req, res) => {
  try {
    const newStudy = new Study({
      ...req.body,
      status: req.body.status || "published",
      lastUpdatedBy: req.body.postedBy || "Admin",
    });
    await newStudy.save();

    res.status(201).json({
      success: true,
      study: newStudy,
      message: "Study created successfully",
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a study
router.put("/:id", async (req, res) => {
  try {
    const updatedStudy = await Study.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: req.body.updatedBy || "Unknown",
      },
      { new: true, runValidators: true }
    );

    if (!updatedStudy)
      return res.status(404).json({ error: "Study not found" });

    res.json({
      success: true,
      study: updatedStudy,
      message: "Study updated successfully",
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Like/Unlike a study
router.post("/:id/like", async (req, res) => {
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: "User ID required" });

  try {
    const study = await Study.findById(req.params.id);
    if (!study) return res.status(404).json({ error: "Study not found" });

    const alreadyLiked = study.likes.includes(userId);

    if (alreadyLiked) {
      study.likes = study.likes.filter((id) => id !== userId);
    } else {
      study.likes.push(userId);
    }

    await study.save();

    res.json({
      success: true,
      liked: !alreadyLiked,
      likes: study.likes,
      totalLikes: study.likes.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Favorite/Unfavorite a study
router.post("/:id/favorite", async (req, res) => {
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: "User ID required" });

  try {
    const study = await Study.findById(req.params.id);
    if (!study) return res.status(404).json({ error: "Study not found" });

    const alreadyFavorited = study.favorites.includes(userId);

    if (alreadyFavorited) {
      study.favorites = study.favorites.filter((id) => id !== userId);
    } else {
      study.favorites.push(userId);
    }

    await study.save();

    res.json({
      success: true,
      favorited: !alreadyFavorited,
      favorites: study.favorites,
      totalFavorites: study.favorites.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Share a study
router.post("/:id/share", async (req, res) => {
  try {
    const study = await Study.findById(req.params.id);
    if (!study) return res.status(404).json({ error: "Study not found" });

    study.shareCount += 1;
    await study.save();

    res.json({
      success: true,
      shareCount: study.shareCount,
      message: "Share recorded successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new comment to a study
router.post("/:id/comments", async (req, res) => {
  const { user, text } = req.body;

  if (!user || !text)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const study = await Study.findById(req.params.id);
    if (!study) return res.status(404).json({ error: "Study not found" });

    study.comments.push({
      user,
      text,
      likes: [],
    });

    await study.save();

    const newComment = study.comments[study.comments.length - 1];

    res.status(201).json({
      success: true,
      comment: newComment,
      totalComments: study.comments.length,
      message: "Comment added successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like/Unlike a comment
router.post("/:studyId/comments/:commentId/like", async (req, res) => {
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: "User ID required" });

  try {
    const study = await Study.findById(req.params.studyId);
    if (!study) return res.status(404).json({ error: "Study not found" });

    const comment = study.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const alreadyLiked = comment.likes.includes(userId);

    if (alreadyLiked) {
      comment.likes = comment.likes.filter((id) => id !== userId);
    } else {
      comment.likes.push(userId);
    }

    await study.save();

    res.json({
      success: true,
      liked: !alreadyLiked,
      likes: comment.likes,
      totalLikes: comment.likes.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a comment
router.put("/:studyId/comments/:commentId", async (req, res) => {
  const { text } = req.body;

  if (!text) return res.status(400).json({ error: "Text is required" });

  try {
    const study = await Study.findById(req.params.studyId);
    if (!study) return res.status(404).json({ error: "Study not found" });

    const comment = study.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    comment.text = text;
    comment.updatedAt = new Date();

    await study.save();

    res.json({
      success: true,
      comment: comment,
      message: "Comment updated successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a comment
router.delete("/:studyId/comments/:commentId", async (req, res) => {
  try {
    const study = await Study.findById(req.params.studyId);
    if (!study) return res.status(404).json({ error: "Study not found" });

    const comment = study.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    comment.remove();
    await study.save();

    res.json({
      success: true,
      message: "Comment deleted successfully",
      totalComments: study.comments.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a reply to a comment
router.post("/:studyId/comments/:commentId/replies", async (req, res) => {
  const { user, text } = req.body;

  if (!user || !text)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const study = await Study.findById(req.params.studyId);
    if (!study) return res.status(404).json({ error: "Study not found" });

    const comment = study.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    comment.replies.push({ user, text });
    await study.save();

    const newReply = comment.replies[comment.replies.length - 1];

    res.status(201).json({
      success: true,
      reply: newReply,
      totalReplies: comment.replies.length,
      message: "Reply added successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get studies by user
router.get("/user/:userId", async (req, res) => {
  try {
    const studies = await Study.find({
      $or: [
        { "comments.user": req.params.userId },
        { "comments.replies.user": req.params.userId },
        { likes: req.params.userId },
        { favorites: req.params.userId },
      ],
      status: "published",
    }).sort({ createdAt: -1 });

    const userStats = {
      comments: studies.reduce((sum, study) => {
        const userComments = study.comments.filter(
          (c) => c.user === req.params.userId
        );
        const userReplies = study.comments.reduce((total, comment) => {
          return (
            total +
            comment.replies.filter((r) => r.user === req.params.userId).length
          );
        }, 0);
        return sum + userComments.length + userReplies;
      }, 0),
      likes: studies.reduce(
        (sum, study) => sum + (study.likes.includes(req.params.userId) ? 1 : 0),
        0
      ),
      favorites: studies.reduce(
        (sum, study) =>
          sum + (study.favorites.includes(req.params.userId) ? 1 : 0),
        0
      ),
      totalStudies: studies.length,
    };

    res.json({
      studies,
      stats: userStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get featured studies
router.get("/featured/studies", async (req, res) => {
  try {
    const studies = await Study.find({
      isFeatured: true,
      status: "published",
    })
      .sort({ createdAt: -1 })
      .limit(6);

    res.json(studies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trending studies
router.get("/trending/studies", async (req, res) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const studies = await Study.find({
      createdAt: { $gte: oneWeekAgo },
      status: "published",
    })
      .sort({ views: -1, likes: -1 })
      .limit(5);

    res.json(studies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search studies
router.get("/search/advanced", async (req, res) => {
  try {
    const { q, category, difficulty, timeFilter, limit = 10 } = req.query;

    let query = { status: "published" };

    if (q) {
      const searchRegex = new RegExp(q, "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { callToAction: searchRegex },
        { "verses.reference": searchRegex },
        { "verses.text": searchRegex },
        { "songs.name": searchRegex },
      ];
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (difficulty && difficulty !== "all") {
      query.difficulty = difficulty;
    }

    if (timeFilter === "week") {
      query.createdAt = {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      };
    } else if (timeFilter === "month") {
      query.createdAt = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };
    }

    const studies = await Study.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const suggestions = await Study.distinct("tags", query).limit(10);

    res.json({
      results: studies,
      suggestions,
      total: studies.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
