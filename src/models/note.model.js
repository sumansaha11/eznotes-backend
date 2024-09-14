import mongoose, { Schema } from "mongoose";

const noteSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
        },
        content: {
            type: String,
            required: [true, 'Content is required'],
        },
        tags: {
            type: [String],
            default: [],
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        userId: {
            type: String,
            required: true,
        }
    }, { timestamps: true }
);

export const Note = mongoose.model("Note", noteSchema);