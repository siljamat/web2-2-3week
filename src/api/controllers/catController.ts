import {User, Cat} from '../../types/DBTypes';
import {NextFunction, Request, Response} from 'express';
import catModel from '../models/catModel';
import CustomError from '../../classes/CustomError';
import rectangleBounds from '../../utils/rectangleBounds';

// TODO: create following functions:
// - catGetByUser - get all cats by current user id
const catGetByUser = async (
    req: Request,
    res: Response<Cat[]>,
    next: NextFunction
    ) => {
    try {
        const cats = await catModel.find({owner: res.locals.user._id}).populate({
            path: 'owner',
            select: '-__v -password -role',
        });
        res.json(cats);
    } catch (error) {
        next(error);
    }
}

// - catGetByBoundingBox - get all cats by bounding box coordinates (getJSON)
const catGetByBoundingBox = async (
  req: Request<{}, {}, {}, {topRight: string; bottomLeft: string}>,
  res: Response<Cat[]>,
  next: NextFunction
) => {
  try {
    const topRight = req.query.topRight;
    const bottomLeft = req.query.bottomLeft;
    const [rightCorner1, rightCorner2] = topRight.split(',');
    const [leftCorner1, leftCorner2] = bottomLeft.split(',');

    const bounds = rectangleBounds(
      {
        lat: Number(rightCorner1),
        lng: Number(rightCorner2),
      },
      {
        lat: Number(leftCorner1),
        lng: Number(leftCorner2),
      }
    );

    const cats = await catModel
      .find({
        location: {
          $geoWithin: {
            $geometry: bounds,
          },
        },
      })
      .select('-__v');
    res.json(cats);
  } catch (err) {
    next(err);
  }
}

// - catPutAdmin - only admin can change cat owner
const catPutAdmin = async (
    req: Request<{id: string}, {}, Omit<Cat, '_id'>>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (req.user && (req.user as User).role !== 'admin') {
        throw new CustomError('Access restricted', 403);
      }
      req.body.location = res.locals.coords;
      const cat = await catModel
        .findByIdAndUpdate(req.params.id, req.body, {new: true})
        .select('-__v');
      if (!cat) {
        throw new CustomError('Cat not found', 404);
      }
      res.json({message: 'Cat updated', data: cat});
    } catch (err) {
      next(err);
    }
  };

// - catDeleteAdmin - only admin can delete cat
const catDeleteAdmin = async (
    req: Request<{id: string}>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (res.locals.user.role !== 'admin') {
        throw new CustomError('Access restricted', 404);
      }
      const cat = (await catModel.findByIdAndDelete(
        req.params.id
      )) as unknown as Cat;
      if (!cat) {
        throw new CustomError('Cat not found', 404);
      }
      res.json({message: 'Cat deleted', data: cat});
    } catch (err) {
      next(err);
    }
  };

// - catDelete - only owner can delete cat
const catDelete = async (
    req: Request<{id: string}>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const cat = (await catModel.findOneAndDelete({
        _id: req.params.id,
        owner: res.locals.user._id,
      })) as unknown as Cat;
  
      if (!cat) {
        throw new CustomError('Cat not found', 404);
      }
      res.json({message: 'Cat deleted', data: cat});
    } catch (err) {
      next(err);
    }
  };

// - catPut - only owner can update cat
const catPut = async (
  req: Request<{id: string}, {}, Omit<Cat, '_id'>>,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user && (req.user as User)._id !== (req.body as Cat).owner) {
      throw new CustomError('Access restricted', 403);
    }
    req.body.location = res.locals.coords;
    const cat = await catModel
      .findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      })
      .select('-__v');
    if (!cat) {
      throw new CustomError('Cat not found', 404);
    }
    res.json({message: 'Cat updated', data: cat});
  } catch (err) {
    next(err);
  }
};

// - catGet - get cat by id
const catGet = async (
    req: Request<{id: string}>,
    res: Response<Cat>,
    next: NextFunction
  ) => {
    try {
      const cat = await catModel.findById(req.params.id).populate({
        path: 'owner',
        select: '-__v -password -role',
      });
      if (!cat) {
        throw new CustomError('Cat not found', 404);
      }
      res.json(cat);
    } catch (err) {
      next(err);
    }
  };

// - catListGet - get all cats
const catListGet = async (
    req: Request<{}, {}, {}, {limit: string; offset: string}>,
    res: Response<Cat[]>,
    next: NextFunction
    ) => {
    try {
        const limit = parseInt(req.query.limit);
        const offset = parseInt(req.query.offset);
        const cats = await catModel.find().limit(limit).skip(offset);
        res.json(cats);
    } catch (error) {
        next(error);
    }
}

// - catPost - create new cat
const catPost = async (
    req: Request<{}, {}, Omit<Cat, '_id'>>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.body.location) {
        req.body.location = res.locals.coords;
      }
      req.body.owner = res.locals.user._id;
      const cat = await catModel.create(req.body);
      res.status(200).json({message: 'Cat created', data: cat});
    } catch (err) {
      next(err);
    }
  };

export {catGetByUser, catPost, catListGet, catGet, catPut, catDelete, catGetByBoundingBox, catPutAdmin, catDeleteAdmin};