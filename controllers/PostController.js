const Post = require('../models/PostModel');
const User = require('../models/UserModel');
const asyncHandler = require('express-async-handler');

const createPost = asyncHandler(async (req, res) => {
    const { postedBy, textComment, image } = req.body;
    if (!postedBy || !textComment) throw new Error('Missing postedBy or textComment');

    const user = await User.findById(postedBy);
    if (!user) throw new Error('User not found');
    if (user._id.toString() !== req.user._id.toString())
        throw new Error('Unauthorized to create post because user._id !== req.user._id');

    const maxLength = 500;
    if (textComment.length > maxLength) throw new Error(`Text comment should be less than ${maxLength} words`);

    const newPost = await Post.create(req.body);
    return res.status(200).json({
        success: newPost ? true : false,
        message: newPost ? 'Created post successfully' : 'Failed to create post',
        newPost,
    });
});

const getDetailPost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    if (!postId) throw new Error('Post not found');

    const post = await Post.findByIdAndUpdate(
        postId,
        {
            $inc: { numberViews: 1 },
        },
        { new: true },
    );
    return res.status(200).json({
        success: post ? true : false,
        post: post ? post : 'Get detail post failed',
    });
});

const getAllPosts = asyncHandler(async (req, res, next) => {
    const post = await Post.find();
    return res.status(200).json({
        success: post ? true : false,
        post: post ? post : 'Get all posts failed',
    });
});

const updatePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    if (!postId) throw new Error(`Post ${postId} not found`);

    const post = await Post.findById(postId);
    if (post.postedBy.toString() !== req.user._id.toString()) throw new Error('Unauthorized to update post');

    if (Object.keys(req.body).length === 0) throw new Error('You must type at least one field to update');
    const updatePost = await Post.findByIdAndUpdate(postId, req.body, { new: true });
    return res.status(200).json({
        success: updatePost ? true : false,
        updatePost: updatePost ? updatePost : 'Update post failed',
    });
});

const deletePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    if (!postId) throw new Error(`Post ${postId} not found`);

    const post = await Post.findById(postId);
    if (post.postedBy.toString() !== req.user._id.toString()) throw new Error('Unauthorized to delete post');

    const deletePost = await Post.findByIdAndDelete(postId);
    return res.status(200).json({
        success: deletePost ? true : false,
        deletePost: deletePost ? deletePost : 'Delete post failed',
    });
});

const likePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { _id } = req.user;

    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');
    const userLikedPost = post.likes.includes(_id);

    if (userLikedPost) {
        const response = await Post.findByIdAndUpdate(
            postId,
            {
                $pull: { likes: _id },
            },
            { new: true },
        );
        return res.status(200).json({
            success: response ? true : false,
            message: response ? 'Unliked post successfully' : 'Unliked post failed',
            response: response ? response : 'Unliked post failed',
        });
    } else {
        const response = await Post.findByIdAndUpdate(
            postId,
            {
                $push: { likes: _id },
            },
            { new: true },
        );
        return res.status(200).json({
            success: response ? true : false,
            message: response ? 'Liked post successfully' : 'Liked post failed',
            response: response ? response : 'Liked post failed',
        });
    }
});

const replyPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const { textComment } = req.body;
    const { _id } = req.user;
    const userAvatar = req.user.userAvatar;
    const username = req.user.username;

    if (!textComment) throw new Error('Text comment field is required');
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');

    const reply = { _id, textComment, userAvatar, username };
    post.replies.push(reply);
    await post.save();

    return res.status(200).json({
        success: post ? true : false,
        post: post ? post : 'Reply post failed',
    });
});

const savePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { _id } = req.user;

    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');
    const userLikedPost = post.savedLists.includes(_id);

    if (userLikedPost) {
        const response = await Post.findByIdAndUpdate(
            postId,
            {
                $pull: { savedLists: _id },
            },
            { new: true },
        );
        return res.status(200).json({
            success: response ? true : false,
            message: response ? 'Unsaved post successfully' : 'Unsaved post failed',
            response: response ? response : 'Unsaved post failed',
        });
    } else {
        const response = await Post.findByIdAndUpdate(
            postId,
            {
                $push: { savedLists: _id },
            },
            { new: true },
        );
        return res.status(200).json({
            success: response ? true : false,
            message: response ? 'Saved post successfully' : 'Saved post failed',
            response: response ? response : 'Saved post failed',
        });
    }
});

const repostPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    const originalPost = await Post.findById(postId);
    if (!originalPost) {
        return res.status(404).send('Post not found');
    }

    const repost = new Post({
        postedBy: userId,
        text: originalPost.text,
        image: originalPost.image,
        numberViews: originalPost.numberViews,
        likes: originalPost.likes,
        replies: originalPost.replies,
        savedLists: originalPost.savedLists,
        originalPost: originalPost._id,
        lastRepostedAt: Date.now(),
    });
    console.log('repost: ', repost);

    await repost.save();

    originalPost.numberViewsRepost += 1;
    await originalPost.updateOne({ numberViewsRepost: originalPost.numberViewsRepost }, { timestamps: false }); // Không cập nhật updatedAt

    console.log('repost: ', repost);
    console.log('originalPost: ', originalPost);

    return res.status(200).json({
        success: repost ? true : false,
        message: repost ? 'Reposted post successfully' : 'Unreposted post failed',
        repost: repost ? repost : 'Unreposted post failed',
    });
});

const getFeedPosts = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    const user = await User.findById(_id);
    if (!user) throw new Error('User not found');

    const isFollowing = user.following;
    const feedPosts = await Post.find({ postedBy: { $in: isFollowing } }).sort({ createdAt: -1 });
    res.status(200).json({
        success: feedPosts ? true : false,
        feedPosts: feedPosts ? feedPosts : 'Get feed posts failed',
    });
});

module.exports = {
    createPost,
    getDetailPost,
    getAllPosts,
    updatePost,
    deletePost,
    likePost,
    replyPost,
    savePost,
    repostPost,
    getFeedPosts,
};
