import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getFilterSchemaFor,
  getModelSchemaRef,
  getWhereSchemaFor,
  patch,
  put,
  del,
  requestBody,
} from '@loopback/rest';
import {inject} from '@loopback/core';
import {User} from '../models';
import {
  UserRepository,
  NotificationsRepository,
  CategoriesRepository,
  TravelPreferencesRepository,
} from '../repositories';

import {
  authenticate,
  TokenService,
  UserService,
} from '@loopback/authentication';
import {UserProfile, securityId, SecurityBindings} from '@loopback/security';
import {
  CredentialsRequestBody,
  UserProfileSchema,
} from './specs/user-controller-specs';
import {Credentials} from '../repositories/user.repository';
import {TokenServiceBindings, UserServiceBindings} from '../keys';
import * as nodemailer from 'nodemailer';
const cron = require('node-cron');
const moment = require('moment');
const fs = require('fs');
const express = require('express');
const app = express();
//const CircularJSON = require('circular-json');

import axios from 'axios';
import {type} from 'os';
// import {CategoriesController} from './categories.controller';
// import {json} from 'express';

const crypto = require('crypto');

// import JSON from 'circular-json';
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'staytune.node@gmail.com',
    pass: 'nuevesol@9',
  },
});

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(TravelPreferencesRepository)
    public travelPreferenceRepository: TravelPreferencesRepository,
    @repository(NotificationsRepository)
    public notificationsRepository: NotificationsRepository,
    @repository(CategoriesRepository)
    public categoriesRepository: CategoriesRepository,

    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: UserService<User, Credentials>,
  ) {}

  @post('/users', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {'application/json': {schema: getModelSchemaRef(User)}},
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {exclude: ['id']}),
        },
      },
    })
    user: Omit<User, 'id'>,
  ): Promise<object> {
    const extUser = await this.userRepository.findOne({
      where: {email: user.email},
    });
    if (extUser) {
      return {
        message: 'User already exists, Please login',
        status: 'failed',
      };
    } else {
      const link =
        'https://staytune.austinconversionoptimization.com/email-verification/?email=' +
        user.email;
      const id = Math.random() * 10000;
      const otp = Math.floor(id);
      const mailOptions = {
        from: 'info@staytune.com',
        to: user.email,
        subject: 'Email Verification from Staytune',
        html:
          'Hello ' +
          user.firstname +
          ' ' +
          user.lastname +
          ', The otp to verify your email address is ' +
          otp +
          '<br>',
      };

      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.message);
        }
      });

      const mykey = crypto.createCipher('aes-128-cbc', 'mypassword');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let mystr = mykey.update(user.password, 'utf8', 'hex');
      mystr = mystr + mykey.final('hex');

      // eslint-disable-next-line require-atomic-updates
      user.password = mystr;

      const newUser = await this.userRepository.create(user);
      return {
        id: newUser.id,
        message: 'User has been registered successfully ',
        status: 'success',
        otp: otp,
      };
    }
  }

  @get('/users/count', {
    responses: {
      '200': {
        description: 'User model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @param.query.object('where', getWhereSchemaFor(User)) where?: Where<User>,
  ): Promise<Count> {
    return this.userRepository.count(where);
  }

  @get('/users', {
    responses: {
      '200': {
        description: 'Array of User model instances',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(User)},
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async find(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.query.object('filter', getFilterSchemaFor(User))
    filter?: Filter<User>,
  ): Promise<User[]> {
    currentUserProfile.id = currentUserProfile[securityId];
    return this.userRepository.find(filter);
  }

  // @get('/surya', {
  //   responses: {
  //     '200': {
  //       description: 'Array of User model instances',
  //       headers: {
  //         'content-type': 'application/json',
  //       },
  //     },
  //   },
  // })
  // async test() {
  //   console.log('hello surya by cron');
  //   return 'hai';
  // }

  @get('/users/me', {
    responses: {
      '200': {
        description: 'The current user profile',
        content: {
          'application/json': {
            schema: UserProfileSchema,
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async printCurrentUser(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<UserProfile> {
    currentUserProfile.id = currentUserProfile[securityId];
    delete currentUserProfile[securityId];
    return currentUserProfile;
  }

  @patch('/users', {
    responses: {
      '200': {
        description: 'User PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  @authenticate('jwt')
  async updateAll(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {partial: true}),
        },
      },
    })
    user: User,
    @param.query.object('where', getWhereSchemaFor(User)) where?: Where<User>,
  ): Promise<Count> {
    currentUserProfile.id = currentUserProfile[securityId];
    return this.userRepository.updateAll(user, where);
  }

  @get('/users/{id}', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {'application/json': {schema: getModelSchemaRef(User)}},
      },
    },
  })
  async findById(@param.path.string('id') id: string): Promise<User> {
    return this.userRepository.findById(id);
  }

  @patch('/users/{id}', {
    responses: {
      '204': {
        description: 'User PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {partial: true}),
        },
      },
    })
    user: User,
  ): Promise<object> {
    await this.userRepository.updateById(id, user);
    const updatedData = await this.userRepository.findById(id);
    // console.log(checkUser, '5d9ab8211113661189ffb735');

    // console.log(updatedUser, 'userupdated');

    return {
      status: 'success',
      message: 'successfully Updated',
      data: updatedData,
    };
  }

  @put('/users/{id}', {
    responses: {
      '204': {
        description: 'User PUT success',
      },
    },
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() user: User,
  ): Promise<void> {
    await this.userRepository.replaceById(id, user);
  }

  @del('/users/{id}', {
    responses: {
      '204': {
        description: 'User DELETE success',
      },
    },
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.userRepository.deleteById(id);
  }

  @post('/users/{email}/', {
    responses: {
      '200': {
        description: 'Array of Admin model instances',
        headers: {
          'content-type': 'application/json',
        },
      },
    },
  })
  async update(@param.path.string('email') email: string): Promise<object> {
    const User1 = await this.userRepository.findOne({where: {email: email}});
    let Id: string;
    if (User1 !== null) {
      Id = User1.id;

      User1.verified = true;
      await this.userRepository.updateById(Id, User1);
      return {
        data: User1.verified,
      };
    }
    return {
      data: 'false',
    };
  }

  @post('/user/forgot-password', {
    responses: {
      '200': {
        description: 'Forgot User Password',
        content: {'application/json': {schema: {'x-ts-type': User}}},
      },
    },
  })
  async forgotPassword(@requestBody() body: User): Promise<object> {
    const user = await this.userRepository.findOne({
      where: {email: body.email},
    });
    if (user != null) {
      const id = Math.random() * 10000;
      const otp = Math.floor(id);
      console.log(otp, 'otp');

      const mailOptions = {
        from: 'info@staytune.com',
        to: user.email,
        subject: 'Email Verification from Staytune',
        html: 'Hello ' + user.fullname + 'your otp is' + otp,
      };

      const response = await transporter.sendMail(mailOptions);

      return {
        otp: otp,
        id: user.id,
      };
    } else {
      return {
        status: 'no user found',
      };
    }
  }

  public async getTypes(type: any, body: any) {
    let data: any = {};

    data = await axios.post(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=' +
        body.lat +
        ',' +
        body.long +
        '&radius=1500&type=' +
        type +
        '&key=AIzaSyBI_ae3Hvrib8Bao3_WrhXLEHKuGj1J8pQ',
      {
        headers: {
          'content-type': 'application/json',
        },
      },
    );

    let finalResponse: any = [];
    //let result: any = [];
    //let response1 = await data.data.results.map((result: any) => result.name);
    // response1 = await response1.concat(data.data.results);
    finalResponse = await finalResponse.concat(data.data.results);
    // console.log(finalResponse, 'final');
    // console.log(data, 'datadad');

    return finalResponse;
  }

  // public async notifications(data: any, text: any, parentCategory: any) {
  //   console.log(text, 'text');
  //   console.log('hello');

  //   const information: any = {
  //     // eslint-disable-next-line @typescript-eslint/camelcase
  //     app_id: '8d39b7db-d029-4bbd-af58-20e3f53cc4a9',

  //     // eslint-disable-next-line @typescript-eslint/camelcase
  //     include_player_ids: [data.id],

  //     contents: {
  //       en:
  //         'These are the famous' +
  //         ' ' +
  //         parentCategory +
  //         ' ' +
  //         'near you' +
  //         ' ' +
  //         text,
  //     },
  //   };
  //   const details = axios.post(
  //     'https://onesignal.com/api/v1/notifications',
  //     information,
  //     {
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization:
  //           'Basic NDA5YWNmM2UtODFhZi00MzMzLTg0OTItYTFiODg0OTA4Njlk',
  //       },
  //     },
  //   );
  //   // console.log('details', details);

  //   // console.log(data, text, 'any');
  // }

  public async notifications(data: any, message: any) {
    const information: any = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      app_id: '8d39b7db-d029-4bbd-af58-20e3f53cc4a9',

      // eslint-disable-next-line @typescript-eslint/camelcase
      include_player_ids: [data],

      contents: {
        en: message,
      },
    };
    const details = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      information,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Basic NDA5YWNmM2UtODFhZi00MzMzLTg0OTItYTFiODg0OTA4Njlk',
        },
      },
    );
    // console.log('details', details);

    // console.log(data, text, 'any');
  }

  @post('/users/userDetails/', {
    responses: {
      '200': {
        description: 'Array of Admin model instances',
        headers: {
          'content-type': 'application/json',
        },
      },
    },
  })
  async movies(@requestBody() body: any): Promise<any> {
    let value: Array<object> = [];
    let result: any = [];
    let response: any = [];

    let endDate: any = [];
    let budgetPerDay: any;

    let finalResult: Array<object> = [];

    const location = await this.userRepository.findById(body.userId);

    if (location.lat === body.lat && location.long === body.long) {
      return {
        status: '400',
      };
    } else {
      console.log(location.lat, location.long, body.lat, body.long, 'location');
      const preference: any = await this.travelPreferenceRepository.find(
        {
          where: {userId: body.userId},
        },
        {strictObjectIDCoercion: true},
      );
      const id = body.userId;
      const data1 = {
        lat: body.lat,
        long: body.long,
      };
      // console.log(preference, 'prefererencedeec');

      await this.userRepository.updateById(id, data1);
      preference.map(async (data2: any) => {
        // console.log(data2.travelDate, 'traveldate');
        if (data2.travelDate) {
          // const startDate = data2.travelDate
          //   .split('-')
          //   .reverse()
          //   .join('-');

          const currentDate: any = moment().format('YYYY-MM-DD');
          console.log(currentDate, 'if current date is not between ');

          const a: any = moment(data2.travelDate, 'DD-MM-YYYY');
          const b: any = moment(data2.travelDate, 'DD-MM-YYYY');
          const startDate = b.format('YYYY-MM-DD');
          console.log(startDate, 'startdate');
          endDate = a.add(data2.daysCount, 'days');
          const dates: any = endDate.format('YYYY-MM-DD');

          console.log(dates, 'dates');

          if (
            moment(currentDate).isBetween(startDate, dates) ||
            moment(currentDate).isSame(startDate)
          ) {
            if (data2.selectedCategories !== null) {
              data2.selectedCategories.map((text: any) => {
                text.subCategories.map((test1: any) => {
                  if (test1.selected === true) {
                    if (!value.includes(test1.categoryname)) {
                      value = value.concat(test1.categoryname);
                    }
                  }
                });
              });
              console.log(data2.totalBudget, 'total123');
              console.log(data2.daysCount, 'count123');
              budgetPerDay = data2.totalBudget / data2.daysCount;
            }
          }
        }
      });
      console.log(value, 'valuees');
      console.log(budgetPerDay, 'budget');

      value.map(async (type: any) => {
        console.log(type, 'type');
        const placeType: any = await this.categoriesRepository.find({
          where: {categoryname: type},
        });
        result = await this.getTypes(placeType[0].googleCategory, body);
        // if (budgetPerDay > 50) {
        //   console.log('hello');
        // }
        console.log('Api result : ', result);
        if (result.length !== 0) {
          console.log('case 1 : ');
          if (budgetPerDay >= 100) {
            finalResult = [];
            result.map((rating: any) => {
              if (rating.rating >= 4) {
                console.log('shop name : ', rating.name);

                finalResult = finalResult.concat(rating);
              }
            });
          } else if (budgetPerDay < 100 && budgetPerDay >= 50) {
            finalResult = [];
            result.map((rating: any) => {
              if (rating.rating >= 3 && rating.rating < 4) {
                console.log('shop name123 : ', rating.name);

                finalResult = finalResult.concat(rating);
              }
            });
          } else if (budgetPerDay < 50) {
            finalResult = [];
            result.map((rating: any) => {
              if (rating.rating < 3) {
                console.log('shop name1234 : ', rating.name);

                finalResult = finalResult.concat(rating);
              }
            });
          } else {
            console.log('error');
          }

          finalResult = await finalResult.slice(0, 3);
          // finalResult = await finalResult.slice(
          //   finalResult.length,
          //   finalResult.length + 3,
          // );
          console.log('final result : ', finalResult);
          const userInterest: any = finalResult.map((type1: any) => type1.name);
          console.log('userInterest : ', userInterest);
          // await this.notifications(
          //   body,
          //   userInterest,
          //   placeType[0].googleCategory,
          // );
        }

        // eslint-disable-next-line require-atomic-updates
        // eslint-disable-next-line @typescript-eslint/await-thenable
        response = response.concat(finalResult);
      });

      console.log(response, 'respnse');

      // setTimeout(() => {
      //   response.map((value2: any) => {
      //     // eslint-disable-next-line @typescript-eslint/no-floating-promises
      //     this.notificationsRepository.create({
      //       date: Date.now(),
      //       notification:
      //         'Hello' +
      //         ' ' +
      //         body.userName +
      //         ',' +
      //         'These are some of the famous places near you' +
      //         ' ' +
      //         ' ' +
      //         value2.name,
      //       placeId: value2.place_id,
      //       userId: body.userId,
      //     });
      //   });
      //   // console.log(notify.notification, 'notifysss');
      // }, 3000);
      // const notifylist = await this.notificationsRepository.find({
      //   where: {
      //     userId: body.userId,
      //   },
      // });
      // console.log(notifylist, 'suryaaa');
      response.map(async (value2: any) => {
        const notification =
          'Hello' +
          ' ' +
          body.firstname +
          ',' +
          'These are some of the famous places near you' +
          ' ' +
          ' ' +
          value2.name;
        const data = {
          date: Date.now(),
          notification: notification,

          placeId: value2.place_id,
          userId: body.id,
          lat: value2.geometry.location.lat,
          lng: value2.geometry.location.lng,
        };
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        const test = await this.notificationsRepository.create(data);
        console.log('test : ', test);
      });

      if (value) {
        return {
          status: 'Success',
          statuscode: 200,
        };
      } else {
        return {
          status: 'failure',
          statuscode: '400',
        };
      }
    }
  }

  @get('/users/push-notifications', {
    responses: {
      '200': {
        description: 'Array of Admin model instances',
        headers: {
          'content-type': 'application/json',
        },
      },
    },
  })
  async notify(): Promise<any> {
    const currentDate: any = moment().format();
    console.log('current day :', currentDate);
    let budgetPerDay = 0;
    let response: any = [];
    const body: any = {};

    const activePreferences = await this.travelPreferenceRepository.find(
      {
        where: {
          and: [
            {travelDate: {lte: currentDate}},
            {endDate: {gte: currentDate}},
          ],
        },
      },
      {
        strictObjectIDCoercion: true,
      },
    );
    console.log('active preferences', activePreferences);
    let finalResult: Array<object> = [];
    let userData: any;
    activePreferences.map(async (preference: any) => {
      let selectedSubCategory: any;
      if (preference.selectedCategories !== null) {
        userData = await this.userRepository.findById(preference.userId);
        console.log('selectedCategories', preference.selectedCategories);
        preference.selectedCategories.map(async (categories: any) => {
          console.log('categories', categories);
          categories.subCategories.map(async (subCategory: any) => {
            // console.log('subcategory:', subCategory);
            if (subCategory.selected === true) {
              console.log(
                'selected sub Categories : ',
                subCategory.categoryname,
              );
              selectedSubCategory = subCategory.categoryname;
              budgetPerDay = preference.totalBudget / preference.daysCount;
              console.log('Budget per day : ', budgetPerDay);
              const placeType: any = await this.categoriesRepository.find({
                where: {categoryname: selectedSubCategory},
              });
              const locationData = {
                lat: '30.2672',
                long: '-97.7431',
              };
              const result = await this.getTypes(
                placeType[0].googleCategory,
                locationData,
              );
              // console.log('Near preferences types : ', result);
              if (result.length !== 0) {
                if (budgetPerDay >= 100) {
                  result.map((rating: any) => {
                    if (rating.rating >= 4) {
                      finalResult = finalResult.concat(rating);
                    }
                  });
                } else if (budgetPerDay < 100 && budgetPerDay >= 50) {
                  result.map((rating: any) => {
                    if (rating.rating >= 3 && rating.rating < 4) {
                      finalResult = finalResult.concat(rating);
                    }
                  });
                } else if (budgetPerDay < 50) {
                  result.map((rating: any) => {
                    if (rating.rating < 3) {
                      finalResult = finalResult.concat(rating);
                    }
                  });
                } else {
                  console.log('error');
                }
              }
              // const notificationResult: any = [];
              console.log(' /********************* / ');
              finalResult = await finalResult.slice(0, 1);
              console.log('final result : ', finalResult);
              const userInterest: any = finalResult.map(
                (type1: any) => type1.name,
              );
              console.log('userInterest : ', userInterest);
              // const data = {
              //   id: userData.deviceId,
              // };
              // await this.notifications(
              //   data,
              //   userInterest,
              //   placeType[0].googleCategory,
              // );
              console.log(' /********************* / ');
              // body = userData;
              response = await response.concat(finalResult);
              // console.log(body.id, 'body');
              console.log(response, 'respnse');
            }
            finalResult = [];
          });
        });
      }
    });

    setTimeout(() => {
      console.log('Notifications Response : ', response);
      let message = '';
      if (Object.keys(response).length !== 0) {
        message =
          'Here are some suggestions based on your interests. Please check in  notifications';
      } else {
        message = 'Sorry, There are no suggestions based on your interets';
      }
      const data = this.notifications(userData.deviceId, message);

      response.map((res: any) => {
        console.log('notificationIcon:', res.icon);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.notificationsRepository.create({
          date: Date.now(),
          notification:
            'Hello' +
            ' ' +
            userData.firstname +
            ' ' +
            userData.lastname +
            ',' +
            'These are some of the famous places near you' +
            ' ' +
            ' ' +
            res.name,
          placeId: res.place_id,
          userId: userData.id,
          lat: res.geometry.location.lat,
          long: res.geometry.location.lng,
          icon: res.icon,
          name: res.name,
        });
        console.log('lat : ', res.geometry.location.lat);
      });
      // console.log(notify.notification, 'notifysss');
    }, 5000);

    // response.map(async (value2: any) => {
    //   const notification =
    //     'Hello' +
    //     ' ' +
    //     body.firstname +
    //     ',' +
    //     'These are some of the famous places near you' +
    //     ' ' +
    //     ' ' +
    //     value2.name;
    //   const data = {
    //     date: Date.now(),
    //     notification: notification,

    //     placeId: value2.place_id,
    //     userId: body.id,
    //     lat: value2.geometry.location.lat,
    //     lng: value2.geometry.location.lng,
    //     icon: value2.icon,
    //     name: value2.name,
    //   };
    //   // eslint-disable-next-line @typescript-eslint/no-floating-promises
    //   const test = await this.notificationsRepository.create(data);
    //   console.log('test : ', test);
    // });

    if (Object.keys(response).length !== 0) {
      return {
        status: 'Success',
        statuscode: 200,
      };
    } else {
      return {
        status: 'failure',
        statuscode: '400',
      };
    }
  }

  @get('/users/push-notifications-for-culniry', {
    responses: {
      '200': {
        description: 'Array of Admin model instances',
        headers: {
          'content-type': 'application/json',
        },
      },
    },
  })
  async statusUpdate(): Promise<any> {
    const currentDate: any = moment().format();
    console.log('current day :', currentDate);
    let budgetPerDay = 0;
    let response: any = [];
    let body: any = {};

    const activePreferences = await this.travelPreferenceRepository.find(
      {
        where: {
          and: [
            {travelDate: {lte: currentDate}},
            {endDate: {gte: currentDate}},
          ],
        },
      },
      {
        strictObjectIDCoercion: true,
      },
    );
    console.log('active preference :', activePreferences);
    let finalResult: Array<object> = [];
    let selectedSubCategory = '';
    let userData: any;
    activePreferences.map(async (preference: any) => {
      if (preference.selectedCategories !== null) {
        userData = await this.userRepository.findById(preference.userId);

        preference.selectedCategories.map((categores: any) => {
          if (categores.categoryname === 'Culinary') {
            categores.subCategories.map(async (subCategory: any) => {
              if (subCategory.selected === true) {
                console.log('selected Categories : ', subCategory.categoryname);
                selectedSubCategory = subCategory.categoryname;
                console.log('selected sub category : ', selectedSubCategory);
                budgetPerDay = preference.totalBudget / preference.daysCount;
                console.log('Budget per day : ', budgetPerDay);
                const placeType: any = await this.categoriesRepository.find({
                  where: {categoryname: selectedSubCategory},
                });
                const locationData = {
                  lat: '30.2672',
                  long: '-97.7431',
                };
                const result = await this.getTypes(
                  placeType[0].googleCategory,
                  locationData,
                );
                // console.log('Near preferences types : ', result);
                if (result.length !== 0) {
                  if (budgetPerDay >= 100) {
                    result.map((rating: any) => {
                      if (rating.rating >= 4) {
                        finalResult = finalResult.concat(rating);
                      }
                    });
                  } else if (budgetPerDay < 100 && budgetPerDay >= 50) {
                    result.map((rating: any) => {
                      if (rating.rating >= 3 && rating.rating < 4) {
                        finalResult = finalResult.concat(rating);
                      }
                    });
                  } else if (budgetPerDay < 50) {
                    result.map((rating: any) => {
                      if (rating.rating < 3) {
                        finalResult = finalResult.concat(rating);
                      }
                    });
                  } else {
                    console.log('error');
                  }
                }
                console.log(' /********************* / ');
                finalResult = await finalResult.slice(0, 1);
                console.log('final result : ', finalResult);
                const userInterest: any = finalResult.map(
                  (type1: any) => type1.name,
                );
                console.log('userInterest : ', userInterest);
                // const data = {
                //   id: userData.deviceId,
                // };
                // await this.notifications(
                //   data,
                //   userInterest,
                //   placeType[0].googleCategory,
                // );
                console.log(' /********************* / ');
                body = userData;
                response = await response.concat(finalResult);
                console.log(body.id, 'body');
                console.log('respnse', response);
              }
              finalResult = [];
            });
          }
        });
      }
    });

    // setTimeout(() => {
    //   response.map(async (value2: any) => {
    //     console.log('value222:', value2.name);
    //     const notification =
    //       'Hello' +
    //       ' ' +
    //       body.firstname +
    //       ',' +
    //       'These are some of the famous places near you' +
    //       ' ' +
    //       ' ' +
    //       value2.name;
    //     const data = {
    //       date: Date.now(),
    //       notification: notification,

    //       placeId: value2.place_id,
    //       userId: body.id,
    //       icon: value2.icon,
    //       name: value2.name,
    //     };
    //     // eslint-disable-next-line @typescript-eslint/no-floating-promises
    //     const test = await this.notificationsRepository.create(data);
    //     return test;
    //   });
    //   // console.log(notify.notification, 'notifysss');
    // }, 3000);

    setTimeout(() => {
      console.log('Notifications Response : ', response);
      let message = '';
      if (Object.keys(response).length !== 0) {
        message =
          'Here are some suggestions based on your interests. Please check in  notifications';
      } else {
        message = 'Sorry, There are no suggestions based on your interets';
      }
      const data = this.notifications(userData.deviceId, message);

      response.map((res: any) => {
        console.log('notificationIcon:', res.icon);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.notificationsRepository.create({
          date: Date.now(),
          notification:
            'Hello' +
            ' ' +
            body.firstname +
            ' ' +
            body.lastname +
            ',' +
            'These are some of the famous places near you' +
            ' ' +
            ' ' +
            res.name,
          placeId: res.place_id,
          userId: body.id,
          lat: res.geometry.location.lat,
          long: res.geometry.location.lng,
          icon: res.icon,
          name: res.name,
        });
        console.log('lat : ', res.geometry.location.lat);
      });
      // console.log(notify.notification, 'notifysss');
    }, 8000);

    // response.map(async (value2: any) => {
    //   const notification =
    //     'Hello' +
    //     ' ' +
    //     body.firstname +
    //     ',' +
    //     'These are some of the famous places near you' +
    //     ' ' +
    //     ' ' +
    //     value2.name;
    //   const data = {
    //     date: Date.now(),
    //     notification: notification,

    //     placeId: value2.place_id,
    //     userId: body.id,
    //     lat: value2.geometry.location.lat,
    //     lng: value2.geometry.location.lng,
    //     icon: value2.icon,
    //     name: value2.name,
    //   };
    //   // eslint-disable-next-line @typescript-eslint/no-floating-promises
    //   const test = await this.notificationsRepository.create(data);
    //   console.log('test : ', test);
    // });

    if (response.length !== 0) {
      return {
        status: 'Success',
        statuscode: 200,
      };
    } else {
      return {
        status: 'failure',
        statuscode: '400',
      };
    }
  }

  @post('/users/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<any> {
    // ensure the user exists, and the password is correct

    const mykey = await crypto.createCipher('aes-128-cbc', 'mypassword');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let mystr = mykey.update(credentials.password, 'utf8', 'hex');
    mystr = mystr + mykey.final('hex');

    // eslint-disable-next-line require-atomic-updates
    credentials.password = mystr;
    console.log(credentials.password, 'pnascnnn');

    const extUser: any = await this.userRepository.findOne({
      where: {email: credentials.email, password: credentials.password},
    });
    let otp = 0;
    if (extUser) {
      if (extUser.verified === false) {
        const id = Math.random() * 10000;
        otp = Math.floor(id);
        const mailOptions = {
          from: 'info@staytune.com',
          to: credentials.email,
          subject: 'Email Verification from Staytune',
          html:
            'Hello ' +
            extUser.firstname +
            ' ' +
            extUser.lastname +
            ', The otp to verify your email address is ' +
            otp +
            '<br>',
        };

        transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log('Email sent: ' + info.message);
          }
        });

        return {
          id: extUser.id,
          message: 'User not verified',
          otp: otp,
        };
      } else {
        const user = await this.userService.verifyCredentials(credentials);
        // console.log(user, 'user');
        user.deviceId = credentials.deviceId;
        let id = '';
        id = user.id;
        await this.userRepository.updateById(id, user);
        const userData = await this.userRepository.findById(id);

        // convert a User object into a UserProfile object (reduced set of properties)
        const userProfile = this.userService.convertToUserProfile(user);

        // create a JSON Web Token based on the user profile
        const token = await this.jwtService.generateToken(userProfile);
        user.token = token;
        return userData;
      }
    } else {
      return {
        message: 'User does not exist',
        status: 'failed',
      };
    }
  }
}
